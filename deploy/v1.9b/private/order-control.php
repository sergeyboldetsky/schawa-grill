<?php
function sg_control(): array {
 $path=__DIR__.'/order-control.json';
 if(!file_exists($path)) return ['accepting'=>true];
 $v=json_decode(file_get_contents($path),true);
 if(!is_array($v)||!is_bool($v['accepting']??null)) throw new RuntimeException('Invalid order control');
 return $v;
}

function sg_schedule(?DateTimeImmutable $now=null): array {
 $now=$now??new DateTimeImmutable('now',new DateTimeZone('Europe/Berlin'));
 $c=sg_control(); $open=$now->setTime(11,0); $close=$now->setTime(21,0); $slots=[];
 if($c['accepting']) for($n=15;$n<=60;$n+=5){$t=$now->modify("+$n minutes");if($t >= $open && $t < $close)$slots[]=$n;}
 return ['accepting'=>$c['accepting'],'state'=>!$c['accepting']?'paused':($now<$open?'before_open':($now >= $close?'closed':($slots?'open':'last_orders'))),'slots'=>$slots,'server_time'=>$now->format(DATE_ATOM),'opens'=>'11:00','closes'=>'21:00'];
}
