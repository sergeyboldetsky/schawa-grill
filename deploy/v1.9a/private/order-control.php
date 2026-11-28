<?php
function sg_control(): array {
 $path=__DIR__.'/order-control.json';
 if(!file_exists($path)) return ['accepting'=>true];
 $v=json_decode(file_get_contents($path),true);
 if(!is_array($v)||!is_bool($v['accepting']??null)) throw new RuntimeException('Invalid order control');
 return $v;
}
