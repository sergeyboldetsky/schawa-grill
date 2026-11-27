<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function respond(array $value, int $code=200): never {http_response_code($code);echo json_encode($value,JSON_UNESCAPED_UNICODE|JSON_INVALID_UTF8_SUBSTITUTE);exit;}
if(($_SERVER['REQUEST_METHOD']??'GET')!=='POST')respond(['error'=>'method_not_allowed'],405);
if(!str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/json'))respond(['error'=>'content_type'],415);
$raw=file_get_contents('php://input',false,null,0,16385);
if($raw===false||strlen($raw)>16384)respond(['error'=>'too_large'],413);
$body=json_decode($raw,true);
if(!is_array($body)||!isset($body['items'])||!is_array($body['items'])||count($body['items'])<1||count($body['items'])>25)respond(['error'=>'invalid_items'],422);
$ingredientIds=['lavash','meat','tomato','carrot','cabbage','pickle','fries','sauce','cheese','pineapple','corn','mushroom'];
$addPrices=['cheese'=>100,'pineapple'=>50,'corn'=>50,'mushroom'=>100];
$extrasPrices=['onion'=>0,'hot'=>0,'meat'=>200,'cheese'=>100];
$drinkIds=['water','cola','sprite','coffee','tea'];
function defaults(string $sku): array {
 global $ingredientIds;
 $v=array_fill_keys(['lavash','meat','tomato','carrot','cabbage','pickle','fries','sauce'],true);
 if($sku==='hawaii'){unset($v['tomato'],$v['pickle']);$v['pineapple']=true;$v['corn']=true;}
 if($sku==='cheese')$v['cheese']=true;
 if($sku==='mushroom')$v['mushroom']=true;
 return $v;
}
try {
 require dirname(__DIR__,3).'/private/auth.php';
 $pdo=db();
 $stmt=$pdo->query('SELECT sku,name_de,category,price_cents,available FROM products WHERE active=1');
 $catalog=[];foreach($stmt->fetchAll(PDO::FETCH_ASSOC) as $p)$catalog[$p['sku']]=$p;
 $rows=[];$total=0;
 foreach($body['items'] as $i=>$line){
  if(!is_array($line)||array_diff(array_keys($line),['sku','qty','ingredients','extras','drink','halved','note']))respond(['error'=>'invalid_item','index'=>$i],422);
   $sku=$line['sku']??null;$qty=$line['qty']??null;
  $combo=is_string($sku)&&str_starts_with($sku,'menu-');
  if($combo)$sku=substr($sku,5);
  if(!is_string($sku)||!isset($catalog[$sku])||!is_int($qty)||$qty<1||$qty>20)respond(['error'=>'invalid_item','index'=>$i],422);
  $p=$catalog[$sku];if(!(int)$p['available'])respond(['error'=>'product_unavailable','sku'=>$sku],422);
  if($combo&&($p['category']!=='shawarma'||empty($catalog['fries']['available']))) respond(['error'=>'combo_unavailable'],422);
  $shawarma=in_array($p['category'],['shawarma','combos'],true);
  $ingredientChanges=$line['ingredients']??[];$extraChanges=$line['extras']??[];
  if(!is_array($ingredientChanges)||!is_array($extraChanges))respond(['error'=>'invalid_options','index'=>$i],422);
  if(!$shawarma&&($ingredientChanges||$extraChanges||array_key_exists('halved',$line)))respond(['error'=>'options_not_allowed','index'=>$i],422);
  $base=defaults($sku==='combo-classic'?'classic':($sku==='combo-xl'?'xl':$sku));
  $unit=(int)$p['price_cents']+($combo?400:0);$selected=$base;
  foreach($ingredientChanges as $id=>$enabled){
   if(!in_array($id,$ingredientIds,true)||!is_bool($enabled))respond(['error'=>'invalid_ingredient','index'=>$i],422);
   if(in_array($id,['lavash','meat'],true)&&$enabled!==true)respond(['error'=>'mandatory_ingredient','index'=>$i],422);
   if(!$shawarma)respond(['error'=>'options_not_allowed','index'=>$i],422);
   if($enabled&&!isset($base[$id]))$unit+=$addPrices[$id]??0;
   if($enabled)$selected[$id]=true;else unset($selected[$id]);
  }
  foreach($extraChanges as $id=>$enabled){
   if(!array_key_exists($id,$extrasPrices)||!is_bool($enabled))respond(['error'=>'invalid_extra','index'=>$i],422);
   if($id==='cheese'){
    if($enabled && !isset($selected['cheese'])){$unit+=100;$selected['cheese']=true;}
    continue;
   }
   if($enabled)$unit+=$extrasPrices[$id];
  }
  $drink=$line['drink']??null;
  if($combo||$p['category']==='combos'){
   if(!is_string($drink)||!in_array($drink,$drinkIds,true)||!isset($catalog[$drink])||!(int)$catalog[$drink]['available'])respond(['error'=>'invalid_combo_drink','index'=>$i],422);
  }elseif($drink!==null)respond(['error'=>'drink_not_allowed','index'=>$i],422);
  if(isset($line['halved'])&&!is_bool($line['halved']))respond(['error'=>'invalid_halved','index'=>$i],422);
  $note=$line['note']??'';if(!is_string($note)||mb_strlen($note)>220)respond(['error'=>'invalid_note','index'=>$i],422);
  $total+=$unit*$qty;if($total>100000)respond(['error'=>'total_too_large'],422);
  $rows[]=['sku'=>$sku,'name_de'=>$p['name_de'],'qty'=>$qty,'unit_price_cents'=>$unit,'line_total_cents'=>$unit*$qty,'ingredients'=>$selected,'extras'=>array_values(array_filter(array_keys(array_filter($extraChanges)),static fn($id)=>$id!=='cheese')),'drink'=>$drink,'halved'=>$line['halved']??false,'note'=>$note];
 }
 respond(['status'=>'quote_only','currency'=>'EUR','total_cents'=>$total,'items'=>$rows,'ordering_enabled'=>false]);
}catch(Throwable $e){error_log('Schawa quote: '.get_class($e).' '.$e->getCode());respond(['error'=>'server_error'],500);}
