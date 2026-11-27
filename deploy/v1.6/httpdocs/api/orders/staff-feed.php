<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
function respond(array $payload, int $code = 200): never {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') respond(['error' => 'method_not_allowed'], 405);
require dirname(__DIR__, 3) . '/private/auth.php';
ini_set('session.use_strict_mode', '1');
session_name('SGSTAFF');
session_set_cookie_params(['path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
session_start();
$user = current_user(['owner', 'admin', 'cashier', 'cook']);
$view = $_GET['view'] ?? 'kitchen';
$testMode = ($_GET['test'] ?? '') === '1' && in_array($user['role'], ['owner', 'admin'], true);
if (!in_array($view, ['kitchen', 'cook'], true)) respond(['error' => 'invalid_view'], 422);
if ($view === 'kitchen' && !in_array($user['role'], ['owner', 'admin', 'cashier'], true)) respond(['error' => 'forbidden'], 403);
if ($view === 'cook' && !in_array($user['role'], ['owner', 'admin', 'cook'], true)) respond(['error' => 'forbidden'], 403);
try {
    $pdo = db();
    $testFilter = "EXISTS (SELECT 1 FROM order_status_history h WHERE h.order_id=orders.id AND h.reason IN ('test_v14c','test_v15_public'))";
    $q = $pdo->prepare("SELECT id,order_number,source,status,fulfillment,pickup_at,total_cents,comment,created_at,updated_at FROM orders WHERE status IN ('new','waiting','cooking','ready') AND " . ($testMode ? $testFilter : 'NOT ' . $testFilter) . " ORDER BY COALESCE(pickup_at,created_at),id LIMIT 100");
    $q->execute();
    $orders = $q->fetchAll(PDO::FETCH_ASSOC);
    $serverTime = (new DateTimeImmutable('now', new DateTimeZone('Europe/Berlin')))->format(DATE_ATOM);
    if (!$orders) respond(['status' => 'ok', 'view' => $view, 'orders' => [], 'server_time' => $serverTime]);
    $ids = array_map(static fn($o) => (int)$o['id'], $orders);
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $q = $pdo->prepare("SELECT oi.id,oi.order_id,oi.product_name,oi.quantity,oi.unit_price_cents,oi.customization,oi.status,p.sku FROM order_items oi LEFT JOIN products p ON p.id=oi.product_id WHERE oi.order_id IN ($marks) ORDER BY oi.id");
    $q->execute($ids);
    $byId = [];
    foreach ($orders as &$o) {
        $o['items'] = [];
        $o['id'] = (int)$o['id'];
        $o['total_cents'] = (int)$o['total_cents'];
        $byId[$o['id']] = count($byId);
    }
    unset($o);
    foreach ($q->fetchAll(PDO::FETCH_ASSOC) as $item) {
        $id = (int)$item['order_id'];
        $index = $byId[$id] ?? null;
        if ($index === null) continue;
        $item['id'] = (int)$item['id'];
        $item['order_id'] = $id;
        $item['quantity'] = (int)$item['quantity'];
        $item['unit_price_cents'] = (int)$item['unit_price_cents'];
        $item['customization'] = json_decode((string)($item['customization'] ?? 'null'), true);
        $orders[$index]['items'][] = $item;
    }
    if ($view === 'cook') {
        $orders = array_values(array_filter(array_map(static function (array $o): array {
            $o['items'] = array_values(array_filter($o['items'], static fn($i) =>
                !in_array($i['status'], ['ready', 'cancelled'], true) &&
                !in_array(strtolower($i['product_name']), ['mineralwasser', 'coca-cola', 'sprite', 'kaffee', 'tee'], true)
            ));
            return $o;
        }, $orders), static fn($o) => count($o['items']) > 0));
    }
    respond(['status' => 'ok', 'view' => $view, 'orders' => $orders, 'server_time' => $serverTime]);
} catch (Throwable $e) {
    error_log('Schawa staff-feed: ' . get_class($e) . ' ' . $e->getCode());
    respond(['error' => 'server_error'], 500);
}
