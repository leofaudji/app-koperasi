<?php

class RedisManager
{
    private static $instance = null;
    private $redis = null;
    private $connected = false;

    private function __construct()
    {
        if (!class_exists('Redis')) {
            error_log("Redis extension not found. Redis features will be disabled.");
            return;
        }

        try {
            $this->redis = new Redis();
            
            // Check if host is a Unix socket
            if (strpos(REDIS_HOST, '/') === 0) {
                $this->connected = @$this->redis->connect(REDIS_HOST);
            } else {
                $this->connected = @$this->redis->connect(REDIS_HOST, REDIS_PORT, 2.0);
            }

            if ($this->connected) {
                if (REDIS_PASS) {
                    $this->redis->auth(REDIS_PASS);
                }
                $this->redis->select(REDIS_DB);
                $this->redis->setOption(Redis::OPT_PREFIX, REDIS_PREFIX);
                $this->redis->setOption(Redis::OPT_SERIALIZER, Redis::SERIALIZER_PHP);
            }
        } catch (Exception $e) {
            error_log("Redis connection failed: " . $e->getMessage());
            $this->connected = false;
        }
    }

    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function isConnected()
    {
        return $this->connected;
    }

    public function get($key)
    {
        if (!$this->connected) return false;
        return $this->redis->get($key);
    }

    public function set($key, $value, $ttl = 3600)
    {
        if (!$this->connected) return false;
        return $this->redis->set($key, $value, $ttl);
    }

    public function delete($key)
    {
        if (!$this->connected) return false;
        return $this->redis->del($key);
    }

    public function flush()
    {
        if (!$this->connected) return false;
        return $this->redis->flushDB();
    }

    public function getKeys($pattern = '*')
    {
        if (!$this->connected) return [];
        return $this->redis->keys($pattern);
    }

    public function info()
    {
        if (!$this->connected) return [];
        return $this->redis->info();
    }
}
