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
        
        if (strpos($key, '*') !== false) {
            $keys = $this->redis->keys($key);
            if (!empty($keys)) {
                // phpredis del() can take an array
                // but since we have a prefix, keys() returns keys WITH prefix
                // and del() automatically adds prefix IF OPT_PREFIX is set.
                // This can be tricky. 
                // However, setOption(Redis::OPT_PREFIX, ...) makes keys() return keys WITHOUT prefix.
                // Wait, actually phpredis with OPT_PREFIX:
                // keys('*') returns keys WITHOUT prefix.
                // del('key') expects key WITHOUT prefix.
                // So it should work.
                return $this->redis->del($keys);
            }
            return true;
        }
        
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

    public function initSession()
    {
        if (!$this->connected) return false;

        try {
            ini_set('session.save_handler', 'redis');
            
            // Format for phpredis session save_path
            if (strpos(REDIS_HOST, '/') === 0) {
                // Unix socket
                $savePath = "unix://" . REDIS_HOST . "?prefix=" . REDIS_PREFIX . "session:";
            } else {
                // TCP
                $savePath = "tcp://" . REDIS_HOST . ":" . REDIS_PORT . "?prefix=" . REDIS_PREFIX . "session:";
            }
            
            if (REDIS_PASS) {
                $savePath .= "&auth=" . urlencode(REDIS_PASS);
            }

            ini_set('session.save_path', $savePath);
            return true;
        } catch (Exception $e) {
            error_log("Failed to set Redis session handler: " . $e->getMessage());
            return false;
        }
    }
}
