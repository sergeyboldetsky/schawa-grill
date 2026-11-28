<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require dirname(__DIR__,2).'/private/auth.php';
require dirname(__DIR__,2).'/private/order-control.php';
try {
 if($_SERVER['REQUEST_METHOD']==='GET') reply(sg_schedule());
 if($_SERVER['REQUEST_METHOD']!=='POST') reply(['error'=>'method'],405);
 ini_set('session.use_strict_mode','1');session_name('SGSTAFF');session_set_cookie_params(['path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);session_start();
 current_user(['owner','admin']);
 if(empty($_SESSION['csrf'])||!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??'')) reply(['error'=>'csrf'],403);
 $v=json_decode(file_get_contents('php://input',false,null,0,4096),true);
 if(!is_array($v)||!is_bool($v['accepting']??null)) reply(['error'=>'invalid'],422);
 $c=sg_control(); $hours=$v['hours']??($c['hours']??[]);
 if(!is_array($hours)) reply(['error'=>'invalid_hours'],422);
 foreach($hours as $day=>$h){if(!in_array((int)$day,range(1,7),true)||!is_array($h)||count($h)!==2||!isset($h[0],$h[1])||!is_string($h[0])||!is_string($h[1])||!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D',$h[0])||!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D',$h[1])||$h[0]>=$h[1]) reply(['error'=>'invalid_hours'],422);}
 $pause=$v['pause']??0; if(!in_array($pause,[0,15,30,60],true)) reply(['error'=>'invalid_pause'],422);
 $path=dirname(__DIR__,2).'/private/order-control.json';
 $tmp=tempnam(dirname($path),'sg-control-');
 if(!$tmp) throw new RuntimeException('write');
 if(file_put_contents($tmp,json_encode(['accepting'=>$v['accepting'],'hours'=>$hours,'pause_until'=>!$v['accepting']&&$pause?time()+60*$pause:null]))===false||!rename($tmp,$path)){@unlink($tmp);throw new RuntimeException('write');}
 reply(sg_schedule());
} catch(Throwable $e){reply(['error'=>'control_unavailable'],503);}
