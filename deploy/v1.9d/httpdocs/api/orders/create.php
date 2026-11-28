<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function result(array $data, int $code=200): never {http_response_code($code);echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);exit;}
if(($_SERVER['REQUEST_METHOD']??'')!=='POST')result(['error'=>'method_not_allowed'],405);
if(!str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/json'))result(['error'=>'content_type'],415);
require dirname(__DIR__,3).'/private/auth.php';
require dirname(__DIR__,3).'/private/order-control.php';
$raw=file_get_contents('php://input',false,null,0,16385);
if($raw===false||strlen($raw)>16384)result(['error'=>'too_large'],413);
$b=json_decode($raw,true);
if(!is_array($b))result(['error'=>'invalid_json'],400);
if(array_diff(array_keys($b),['items','request_key','fulfillment','pickup_at','comment','recover_only']))result(['error'=>'unknown_fields'],422);
$key=$b['request_key']??null;
if(!is_string($key)||!preg_match('/^[a-f0-9-]{36}$/iD',$key))result(['error'=>'invalid_request_key'],422);
// V1.9D: request key is a secret random UUID, never expose it in logs or URLs.
$token=hash('sha256','schawa-recovery-v19d:'.$key);
function sg_existing(PDO $pdo,string $key,string $token): ?array {
 $q=$pdo->prepare('SELECT id,order_number,public_token_hash,total_cents,pickup_at FROM orders WHERE request_key=? LIMIT 1');$q->execute([$key]);$r=$q->fetch(PDO::FETCH_ASSOC);
 if(!$r)return null;
 if(!hash_equals($r['public_token_hash'],hash('sha256',$token)))result(['error'=>'legacy_duplicate'],409);
 $q=$pdo->prepare('SELECT COUNT(*) FROM order_items WHERE order_id=?');$q->execute([$r['id']]);
 return ['status'=>'created_test_order','number'=>(string)$r['order_number'],'token'=>$token,'total_cents'=>(int)$r['total_cents'],'items'=>(int)$q->fetchColumn(),'pickup_at'=>$r['pickup_at']];
}
try {$pdo=db();$existing=sg_existing($pdo,$key,$token);if($existing)result($existing);if(($b['recover_only']??false)===true)result(['error'=>'not_found'],404);}catch(Throwable $e){result(['error'=>'server_error'],503);}
try { if(!sg_schedule()['accepting']) result(['error'=>'ordering_paused'],422); } catch(Throwable $e){result(['error'=>'control_unavailable'],503);}
// V1.5 test launch: rate-limit by client IP and globally, outside document root.
$ip=(string)($_SERVER['REMOTE_ADDR']??'unknown');
$dir=dirname(__DIR__,3).'/private/schawa-order-limits';
if(!is_dir($dir)&&!mkdir($dir,0700,true)&&!is_dir($dir))result(['error'=>'temporarily_unavailable'],503);
$nowRate=time();
foreach(['ip-'.hash('sha256',$ip),'global'] as $bucket){
 $fp=fopen($dir.'/'.$bucket.'.json','c+');
 if(!$fp||!flock($fp,LOCK_EX))result(['error'=>'temporarily_unavailable'],503);
 $data=json_decode(stream_get_contents($fp),true);if(!is_array($data))$data=[];
 $data=array_values(array_filter($data,static fn($t)=>is_int($t)&&$t>time()-86400));
 $short=count(array_filter($data,static fn($t)=>$t>time()-600));
 $limit=$bucket==='global'?20:3;$daily=$bucket==='global'?80:12;
 if($short>=$limit||count($data)>=$daily){flock($fp,LOCK_UN);fclose($fp);header('Retry-After: 600');result(['error'=>'rate_limited'],429);}
 $data[]=$nowRate;rewind($fp);ftruncate($fp,0);fwrite($fp,json_encode($data));fflush($fp);flock($fp,LOCK_UN);fclose($fp);
}
$items=$b['items']??null;
if(!is_array($items)||count($items)<1||count($items)>25||!array_is_list($items))result(['error'=>'invalid_items'],422);
$fulfillment=$b['fulfillment']??null;
if(!in_array($fulfillment,['takeaway','eat_in'],true))result(['error'=>'invalid_fulfillment'],422);
$pickup=$b['pickup_at']??null;
if(!is_string($pickup)||!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/D',$pickup))result(['error'=>'invalid_pickup'],422);
$tz=new DateTimeZone('Europe/Berlin');
$dt=DateTimeImmutable::createFromFormat('!Y-m-d H:i:s',$pickup,$tz);
$now=new DateTimeImmutable('now',$tz);
if(!$dt||$dt->format('Y-m-d H:i:s')!==$pickup||$dt<$now->modify('+10 minutes'))result(['error'=>'invalid_pickup'],422);
$schedule=sg_schedule($now); $open=new DateTimeImmutable($now->format('Y-m-d').' '.$schedule['opens'],$tz); $close=new DateTimeImmutable($now->format('Y-m-d').' '.$schedule['closes'],$tz);
if(!$schedule['accepting'] || $dt<$open || $dt >= $close || $dt<$now->modify('+14 minutes') || ($now<$open ? $dt> $open->modify('+45 minutes') : $dt>$now->modify('+61 minutes')))result(['error'=>'pickup_outside_hours'],422);
$comment=$b['comment']??'';
if(!is_string($comment)||mb_strlen($comment)>500)result(['error'=>'invalid_comment'],422);
try {
 $pdo=db();
 $catalog=[];
 foreach($pdo->query('SELECT id,sku,name_de,category,price_cents,available FROM products WHERE active=1')->fetchAll(PDO::FETCH_ASSOC) as $p)$catalog[$p['sku']]=$p;
 $prices=['cheese'=>100,'pineapple'=>50,'corn'=>50,'mushroom'=>100];
 $extraPrices=['onion'=>0,'hot'=>0,'meat'=>200,'cheese'=>100];
 $ids=['lavash','meat','tomato','carrot','cabbage','pickle','fries','sauce','cheese','pineapple','corn','mushroom'];
 $drinks=['water','cola','sprite','coffee','tea'];
 $validated=[];$total=0;
 foreach($items as $i=>$line){
  if(!is_array($line)||array_diff(array_keys($line),['sku','qty','ingredients','extras','drink','halved','note']))result(['error'=>'invalid_item','index'=>$i],422);
   $sku=$line['sku']??null;$qty=$line['qty']??null;
  $combo=is_string($sku)&&str_starts_with($sku,'menu-');
  if($combo)$sku=substr($sku,5);
  if(!is_string($sku)||!isset($catalog[$sku])||!is_int($qty)||$qty<1||$qty>20)result(['error'=>'invalid_item','index'=>$i],422);
  $p=$catalog[$sku];if(!(int)$p['available'])result(['error'=>'product_unavailable','sku'=>$sku],422);
  if($combo&&($p['category']!=='shawarma'||empty($catalog['fries']['available']))) result(['error'=>'combo_unavailable'],422);
  $shawarma=in_array($p['category'],['shawarma','combos'],true);
  $changes=$line['ingredients']??[];$extras=$line['extras']??[];
  if(!is_array($changes)||!is_array($extras))result(['error'=>'invalid_options','index'=>$i],422);
  if(!$shawarma&&($changes||$extras||array_key_exists('halved',$line)))result(['error'=>'options_not_allowed','index'=>$i],422);
  $base=array_fill_keys(['lavash','meat','tomato','carrot','cabbage','pickle','fries','sauce'],true);
  if($sku==='hawaii'){unset($base['tomato'],$base['pickle']);$base['pineapple']=true;$base['corn']=true;}
  if($sku==='cheese')$base['cheese']=true;
  if($sku==='mushroom')$base['mushroom']=true;
  $unit=(int)$p['price_cents']+($combo?400:0);$selected=$base;
  foreach($changes as $id=>$enabled){
   if(!in_array($id,$ids,true)||!is_bool($enabled))result(['error'=>'invalid_ingredient','index'=>$i],422);
   if(in_array($id,['lavash','meat'],true)&&$enabled!==true)result(['error'=>'mandatory_ingredient','index'=>$i],422);
   if(!$shawarma)result(['error'=>'options_not_allowed','index'=>$i],422);
   if($enabled&&!isset($base[$id]))$unit+=$prices[$id]??0;
   if($enabled)$selected[$id]=true;else unset($selected[$id]);
  }
  foreach($extras as $id=>$enabled){
   if(!array_key_exists($id,$extraPrices)||!is_bool($enabled))result(['error'=>'invalid_extra','index'=>$i],422);
   if($id==='cheese'){
    if($enabled && !isset($selected['cheese'])){$unit+=100;$selected['cheese']=true;}
    continue;
   }
   if($enabled)$unit+=$extraPrices[$id];
  }
  $drink=$line['drink']??null;
  if($combo||$p['category']==='combos'){
   if(!is_string($drink)||!in_array($drink,$drinks,true)||!isset($catalog[$drink])||!(int)$catalog[$drink]['available'])result(['error'=>'invalid_combo_drink','index'=>$i],422);
  }elseif($drink!==null)result(['error'=>'drink_not_allowed','index'=>$i],422);
  if(isset($line['halved'])&&!is_bool($line['halved']))result(['error'=>'invalid_halved','index'=>$i],422);
  $note=$line['note']??'';if(!is_string($note)||mb_strlen($note)>220)result(['error'=>'invalid_note','index'=>$i],422);
  $total+=$unit*$qty;if($total>100000)result(['error'=>'total_too_large'],422);
  $validated[]=['product'=>$p,'combo'=>$combo,'qty'=>$qty,'unit'=>$unit,'customization'=>['ingredients'=>$selected,'extras'=>array_values(array_filter(array_keys(array_filter($extras)),static fn($id)=>$id!=='cheese')),'drink'=>$drink,'halved'=>$line['halved']??false,'note'=>$note]];
 }
 if($total<1)result(['error'=>'invalid_total'],422);
 // Prevent concurrent number allocation; lock only around the transaction.
 $lock=$pdo->query("SELECT GET_LOCK('schawa_order_number_v14c',5)")->fetchColumn();
 if((int)$lock!==1)result(['error'=>'try_again'],503);
 try {
  $pdo->beginTransaction();
  $existing=sg_existing($pdo,$key,$token);if($existing){$pdo->rollBack();result($existing);}
  $number=null;
  $check=$pdo->prepare('SELECT 1 FROM orders WHERE order_number=? AND created_at>=DATE_SUB(NOW(),INTERVAL 90 DAY) LIMIT 1');
  for($j=0;$j<40;$j++){$n=(string)random_int(100000,999999);$check->execute([$n]);if(!$check->fetchColumn()){$number=$n;break;}}
  if($number===null)throw new RuntimeException('number_exhausted');
  
  $ins=$pdo->prepare("INSERT INTO orders(order_number,public_token_hash,source,status,fulfillment,pickup_at,total_cents,comment,request_key) VALUES (?,?,'website','new',?,?,?,?,?)");
  $ins->execute([$number,hash('sha256',$token),$fulfillment,$pickup,$total,'[TEST V1.5] '.$comment,$key]);
  $id=(int)$pdo->lastInsertId();
  $itemIns=$pdo->prepare('INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_price_cents,customization) VALUES (?,?,?,?,?,?)');
  foreach($validated as $v){$p=$v['product'];$itemIns->execute([$id,$p['id'],$p['name_de'].($v['combo']?' Menü':''),$v['qty'],$v['unit'],json_encode($v['customization'],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);}
  $pdo->prepare("INSERT INTO order_status_history(order_id,new_status,reason) VALUES (?,'new','test_v15_public')")->execute([$id]);
  $pdo->commit();
  result(['status'=>'created_test_order','number'=>$number,'token'=>$token,'total_cents'=>$total,'items'=>count($validated),'pickup_at'=>$pickup],201);
 }finally {
  if($pdo->inTransaction())$pdo->rollBack();
  $pdo->query("SELECT RELEASE_LOCK('schawa_order_number_v14c')");
 }
}catch(Throwable $e){error_log('Schawa create-test: '.get_class($e).' '.$e->getCode());result(['error'=>'server_error'],500);}
