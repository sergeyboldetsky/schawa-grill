<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
function answer(array $a,int $code=200): never {http_response_code($code);echo json_encode($a,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);exit;}
if(($_SERVER['REQUEST_METHOD']??'')!=='POST')answer(['error'=>'method_not_allowed'],405);
if(!str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/json'))answer(['error'=>'content_type'],415);
require dirname(__DIR__,3).'/private/auth.php';
ini_set('session.use_strict_mode','1');session_name('SGSTAFF');
session_set_cookie_params(['path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);session_start();
$u=current_user(['owner','admin','cashier','cook']);
$csrf=$_SERVER['HTTP_X_CSRF_TOKEN']??'';
if(!is_string($csrf)||!hash_equals((string)($_SESSION['csrf']??''),$csrf))answer(['error'=>'csrf'],403);
$raw=file_get_contents('php://input',false,null,0,4097);
if($raw===false||strlen($raw)>4096)answer(['error'=>'too_large'],413);
$b=json_decode($raw,true);if(!is_array($b))answer(['error'=>'invalid_json'],400);
$testMode=($b['test']??false)===true && in_array($u['role'],['owner','admin'],true);
$kind=$b['kind']??'';$id=$b['id']??null;$expected=$b['expected']??'';$next=$b['next']??'';
if(!in_array($kind,['order','item'],true)||!is_int($id)||$id<1||!is_string($expected)||!is_string($next))answer(['error'=>'invalid_request'],422);
if($kind==='order'){
 if(!in_array($u['role'],['owner','admin','cashier'],true))answer(['error'=>'forbidden'],403);
 $allowed=['new'=>['waiting','cooking','cancelled'],'waiting'=>['cooking','cancelled'],'cooking'=>['ready'],'ready'=>['delivered','no_show']];
}else{
 if(!in_array($u['role'],['owner','admin','cook'],true))answer(['error'=>'forbidden'],403);
 $allowed=['new'=>['cooking'],'cooking'=>['ready']];
}
if(!in_array($next,$allowed[$expected]??[],true))answer(['error'=>'invalid_transition'],422);
try{
 $pdo=db();$pdo->beginTransaction();
 if($kind==='order'){
  $q=$pdo->prepare("SELECT id,status FROM orders WHERE id=? AND " . ($testMode ? "EXISTS (SELECT 1 FROM order_status_history h WHERE h.order_id=orders.id AND h.reason='test_v14c')" : "NOT EXISTS (SELECT 1 FROM order_status_history h WHERE h.order_id=orders.id AND h.reason='test_v14c')") . " FOR UPDATE");
 }else{
  $q=$pdo->prepare("SELECT i.id,i.status,o.status AS order_status FROM order_items i JOIN orders o ON o.id=i.order_id WHERE i.id=? AND o.status='cooking' AND " . ($testMode ? "EXISTS (SELECT 1 FROM order_status_history h WHERE h.order_id=o.id AND h.reason='test_v14c')" : "NOT EXISTS (SELECT 1 FROM order_status_history h WHERE h.order_id=o.id AND h.reason='test_v14c')") . " FOR UPDATE");
 }
 $q->execute([$id]);$row=$q->fetch(PDO::FETCH_ASSOC);
 if(!$row){$pdo->rollBack();answer(['error'=>'not_found_or_test'],404);}
 if($row['status']!==$expected){$pdo->rollBack();answer(['error'=>'status_conflict','current'=>$row['status']],409);}
 if($kind==='order'){
  if($next==='ready'){
   // V1.4K: the cook marks an item as cooking and it leaves the cook screen.
   // The cashier assembles the order and marks all started items ready atomically.
   // Lock items to prevent a concurrent cook update during finalization.
   $items=$pdo->prepare('SELECT id,status FROM order_items WHERE order_id=? FOR UPDATE');
   $items->execute([$id]);
   $statuses=$items->fetchAll(PDO::FETCH_ASSOC);
   if(!$statuses){$pdo->rollBack();answer(['error'=>'items_not_ready'],409);}
   foreach($statuses as $item){
    if(!in_array($item['status'],['cooking','ready','cancelled'],true)){
     $pdo->rollBack();answer(['error'=>'items_not_ready'],409);
    }
   }
   $pdo->prepare("UPDATE order_items SET status='ready' WHERE order_id=? AND status='cooking'")->execute([$id]);
  }
  $q=$pdo->prepare('UPDATE orders SET status=? WHERE id=? AND status=?');$q->execute([$next,$id,$expected]);
  $h=$pdo->prepare('INSERT INTO order_status_history(order_id,old_status,new_status,actor_id,reason) VALUES (?,?,?,?,?)');$h->execute([$id,$expected,$next,$u['id'],'staff_v14f']);
  if($next==='cancelled'){$pdo->prepare("UPDATE order_items SET status='cancelled' WHERE order_id=? AND status!='ready'")->execute([$id]);}
 }else{
  $q=$pdo->prepare('UPDATE order_items SET status=? WHERE id=? AND status=?');$q->execute([$next,$id,$expected]);
 }
 $pdo->commit();answer(['status'=>'ok','kind'=>$kind,'id'=>$id,'next'=>$next]);
}catch(Throwable $e){if(isset($pdo)&&$pdo->inTransaction())$pdo->rollBack();error_log('Schawa staff-action: '.get_class($e).' '.$e->getCode());answer(['error'=>'server_error'],500);}
