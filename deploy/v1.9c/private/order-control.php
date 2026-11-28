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
 $c=sg_control(); $hours=$c['hours']??[]; $day=(int)$now->format('N'); $h=$hours[$day]??['11:00','21:00'];
 $open=$now->setTime((int)substr($h[0],0,2),(int)substr($h[0],3,2)); $close=$now->setTime((int)substr($h[1],0,2),(int)substr($h[1],3,2));
 $accepting=$c['accepting']||(!empty($c['pause_until']) && $c['pause_until'] <= $now->getTimestamp()); $slots=[]; $times=[];
 if($accepting && $now<$open){for($n=0;$n<=45;$n+=5){$t=$open->modify("+$n minutes");if($t >= $now->modify('+15 minutes') && $t<$close){$key=1000+$n;$slots[]=$key;$times[$key]=$t->format('Y-m-d H:i:s');}}}
 elseif($accepting) for($n=15;$n<=60;$n+=5){$t=$now->modify("+$n minutes");if($t<$close)$slots[]=$n;}
 return ['accepting'=>$accepting,'state'=>!$accepting?'paused':($now<$open?'before_open':($now >= $close?'closed':($slots?'open':'last_orders'))),'slots'=>$slots,'times'=>(object)$times,'server_time'=>$now->format(DATE_ATOM),'opens'=>$h[0],'closes'=>$h[1],'in_hours'=>$now >= $open && $now<$close,'hours'=>$hours,'pause_until'=>$c['pause_until']??null];
}
