<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
require dirname(__DIR__,3).'/private/auth.php';
if(($_SERVER['REQUEST_METHOD']??'')!=='POST')reply(['error'=>'method'],405);
if(!str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/json'))reply(['error'=>'content_type'],415);
$raw=file_get_contents('php://input',false,null,0,32769);if($raw===false||strlen($raw)>32768)reply(['error'=>'size'],413);
$b=json_decode($raw,true);$refs=$b['refs']??null;if(!is_array($refs)||count($refs)>50)reply(['error'=>'refs'],422);
try{$pdo=db();$q=$pdo->prepare('SELECT id,order_number AS number,status,created_at,total_cents FROM orders WHERE order_number=? AND public_token_hash=? LIMIT 1');$items=$pdo->prepare('SELECT product_name,quantity,customization FROM order_items WHERE order_id=? ORDER BY id');$out=[];foreach($refs as $r){if(!is_array($r)||!is_string($r['number']??null)||!is_string($r['token']??null)||!preg_match('/^\d{6}$/D',$r['number'])||!preg_match('/^[a-f0-9]{64}$/D',$r['token']))continue;$q->execute([$r['number'],hash('sha256',$r['token'])]);$o=$q->fetch(PDO::FETCH_ASSOC);if(!$o)continue;$items->execute([$o['id']]);$o['items']=[];foreach($items->fetchAll(PDO::FETCH_ASSOC) as $i){$c=json_decode($i['customization']??'',true);$o['items'][]=['product_name'=>$i['product_name'],'quantity'=>(int)$i['quantity'],'drink'=>$c['drink']??null];}unset($o['id']);$out[]=$o;}reply(['orders'=>$out]);}catch(Throwable $e){reply(['error'=>'server_error'],503);}
