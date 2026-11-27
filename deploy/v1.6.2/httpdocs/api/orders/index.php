<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
require dirname(__DIR__,3).'/private/auth.php';
function out(array $data,int $status=200): never {http_response_code($status);echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);exit;}
function body(): array {
 if(!str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/json'))out(['error'=>'content_type'],415);
 $raw=file_get_contents('php://input',false,null,0,16385);
 if($raw===false||strlen($raw)>16384)out(['error'=>'too_large'],413);
 $v=json_decode($raw,true);if(!is_array($v))out(['error'=>'invalid_json'],400);return $v;
}
function staff(): array {
 ini_set('session.use_strict_mode','1');session_name('SGSTAFF');session_set_cookie_params(['path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);session_start();return current_user(['owner','admin','cashier','cook']);
}
function statusView(array $r): array {return ['number'=>$r['order_number'],'status'=>$r['status'],'pickup_at'=>$r['pickup_at'],'created_at'=>$r['created_at']];}
try {
 $pdo=db();$method=$_SERVER['REQUEST_METHOD']??'GET';$action=$_GET['action']??'catalog';
 if($method==='GET'&&$action==='catalog'){
  $rows=$pdo->query('SELECT sku,name_de,category,price_cents,available FROM products WHERE active=1 ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
  out(['products'=>$rows]);
 }
 if($method==='POST'&&$action==='create'){
  // Disabled until checkout, customization pricing and anti-abuse are integrated.
  out(['error'=>'ordering_not_enabled'],503);
  $b=body();$items=$b['items']??null;
  if(!is_array($items)||count($items)<1||count($items)>25)out(['error'=>'invalid_items'],422);
  $key=$b['request_key']??'';if(!is_string($key)||!preg_match('/^[a-f0-9-]{36}$/iD',$key))out(['error'=>'invalid_request_key'],422);
  $fulfillment=$b['fulfillment']??'';if(!in_array($fulfillment,['takeaway','eat_in'],true))out(['error'=>'invalid_fulfillment'],422);
  $pickup=$b['pickup_at']??null;if(!is_string($pickup)||!preg_match('/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/D',$pickup))out(['error'=>'invalid_pickup'],422);
  $tz=new DateTimeZone('Europe/Berlin');$dt=DateTimeImmutable::createFromFormat('!Y-m-d H:i:s',$pickup,$tz);$now=new DateTimeImmutable('now',$tz);
  if(!$dt||$dt->format('Y-m-d H:i:s')!==$pickup||$dt<$now->modify('+10 minutes')||$dt>$now->modify('+2 hours'))out(['error'=>'invalid_pickup'],422);
  $comment=$b['comment']??'';if(!is_string($comment)||mb_strlen($comment)>500)out(['error'=>'invalid_comment'],422);
  $validated=[];$total=0;
  $find=$pdo->prepare('SELECT id,sku,name_de,price_cents FROM products WHERE sku=? AND active=1 AND available=1');
  foreach($items as $item){
   if(!is_array($item)||!is_string($item['sku']??null)||!is_int($item['qty']??null)||$item['qty']<1||$item['qty']>20)out(['error'=>'invalid_item'],422);
   // Customizations and combos must be priced server-side before accepting orders.
   if(count(array_diff(array_keys($item),['sku','qty']))>0)out(['error'=>'customizations_not_supported'],422);
   $find->execute([$item['sku']]);$p=$find->fetch(PDO::FETCH_ASSOC);if(!$p)out(['error'=>'product_unavailable'],422);
   if(str_starts_with($p['sku'],'combo-'))out(['error'=>'combos_not_supported'],422);
   $total+=(int)$p['price_cents']*$item['qty'];$validated[]=[$p,$item['qty']];
  }
  if($total<1||$total>100000)out(['error'=>'invalid_total'],422);
  $token=bin2hex(random_bytes(32));$hash=hash('sha256',$token);
  try {
   $pdo->beginTransaction();
   $q=$pdo->prepare('SELECT order_number FROM orders WHERE request_key=?');$q->execute([$key]);
   if($q->fetchColumn()){ $pdo->rollBack();out(['error'=>'duplicate_request'],409); }
   $number='';$q=$pdo->prepare("SELECT 1 FROM orders WHERE order_number=? AND created_at>=DATE_SUB(NOW(),INTERVAL 90 DAY) LIMIT 1");
   for($i=0;$i<25;$i++){$candidate=(string)random_int(100000,999999);$q->execute([$candidate]);if(!$q->fetchColumn()){$number=$candidate;break;}}
   if($number==='')throw new RuntimeException('number_exhausted');
   $q=$pdo->prepare("INSERT INTO orders (order_number,public_token_hash,source,status,fulfillment,pickup_at,total_cents,comment,request_key) VALUES (?,?,'website','new',?,?,?,?,?)");
   $q->execute([$number,$hash,$fulfillment,$pickup,$total,$comment,$key]);$id=(int)$pdo->lastInsertId();
   $q=$pdo->prepare('INSERT INTO order_items (order_id,product_id,product_name,quantity,unit_price_cents) VALUES (?,?,?,?,?)');
   foreach($validated as [$p,$qty])$q->execute([$id,$p['id'],$p['name_de'],$qty,$p['price_cents']]);
   $pdo->prepare("INSERT INTO order_status_history(order_id,new_status,reason) VALUES (?,'new','website')")->execute([$id]);
   $pdo->commit();out(['number'=>$number,'token'=>$token,'status'=>'new','total_cents'=>$total],201);
  }catch(PDOException $e){if($pdo->inTransaction())$pdo->rollBack();if($e->getCode()==='23000')out(['error'=>'duplicate_request'],409);throw $e;}
 }
 if($method==='GET'&&$action==='status'){
  $number=$_GET['number']??'';$token=$_GET['token']??'';
  if(!is_string($number)||!preg_match('/^\d{6}$/D',$number)||!is_string($token)||!preg_match('/^[a-f0-9]{64}$/iD',$token))out(['error'=>'not_found'],404);
  $q=$pdo->prepare('SELECT id,order_number,status,pickup_at,created_at FROM orders WHERE order_number=? AND public_token_hash=? LIMIT 1');$q->execute([$number,hash('sha256',$token)]);$r=$q->fetch(PDO::FETCH_ASSOC);if(!$r)out(['error'=>'not_found'],404);$v=statusView($r);$q=$pdo->prepare('SELECT p.sku,oi.customization FROM order_items oi LEFT JOIN products p ON p.id=oi.product_id WHERE oi.order_id=? ORDER BY oi.id');$q->execute([$r['id']]);$v['items']=[];foreach($q->fetchAll(PDO::FETCH_ASSOC) as $i){$c=json_decode((string)$i['customization'],true);$v['items'][]=['sku'=>$i['sku'],'drink'=>$c['drink']??null];}out($v);
 }
 if($method==='GET'&&$action==='staff_list'){
  staff();$q=$pdo->query("SELECT id,order_number,source,status,fulfillment,pickup_at,total_cents,comment,created_at FROM orders WHERE created_at>=DATE_SUB(NOW(),INTERVAL 3 DAY) ORDER BY created_at DESC LIMIT 150");out(['orders'=>$q->fetchAll(PDO::FETCH_ASSOC)]);
 }
 if($method==='POST'&&$action==='staff_status'){
  $u=staff();if(!hash_equals($_SESSION['csrf']??'',$_SERVER['HTTP_X_CSRF_TOKEN']??''))out(['error'=>'csrf'],403);
  $b=body();$id=$b['id']??null;$next=$b['status']??'';
  if(!is_int($id)||$id<1||!is_string($next))out(['error'=>'invalid_request'],422);
  $allowed=['new'=>['waiting','cancelled'],'waiting'=>['cooking','cancelled'],'cooking'=>['ready'],'ready'=>['delivered','no_show'],'no_show'=>['ready']];
  if($u['role']==='cook'&&!in_array($next,['cooking','ready'],true))out(['error'=>'forbidden'],403);
  $pdo->beginTransaction();$q=$pdo->prepare('SELECT status FROM orders WHERE id=? FOR UPDATE');$q->execute([$id]);$old=$q->fetchColumn();
  if(!$old||!in_array($next,$allowed[$old]??[],true)){$pdo->rollBack();out(['error'=>'invalid_transition'],409);}
  $pdo->prepare('UPDATE orders SET status=? WHERE id=?')->execute([$next,$id]);
  $pdo->prepare('INSERT INTO order_status_history(order_id,old_status,new_status,actor_id) VALUES (?,?,?,?)')->execute([$id,$old,$next,$u['id']]);$pdo->commit();out(['status'=>$next]);
 }
 out(['error'=>'not_found'],404);
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();error_log('Schawa orders: '.get_class($e).' '.$e->getCode());out(['error'=>'server_error'],500);}
