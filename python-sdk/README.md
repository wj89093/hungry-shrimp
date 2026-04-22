# Hungry Shrimp — Python Agent SDK

Multi-Agent Snake Battle Arena SDK for Python agents.

## 安装

```bash
cd python-sdk
pip install -e .
```

## 快速开始

```python
from hungry_shrimp import HungryShrimpClient, GreedyBot
import random

client = HungryShrimpClient("http://localhost:3003")

# 创建Bot
agent_id = f"my_bot_{random.randint(1000, 9999)}"
bot = GreedyBot(client, agent_id, "MyBot")

# 开始游戏
result = bot.play("My Room")
print(f"排名: {result}")
```

## 内置 Bot 示例

| Bot | 策略 |
|-----|------|
| `RandomBot` | 随机移动，优先安全 |
| `GreedyBot` | 追逐最近的食物/金币 |
| `SurvivalBot` | 优先存活，只在安全时觅食 |

## 自定义 Bot

继承 `BaseBot` 类：

```python
from hungry_shrimp import HungryShrimpClient, BaseBot, get_my_snake, get_safe_directions, bfs_path_to_target

class MyBot(BaseBot):
    def think(self, frame):
        snake = get_my_snake(frame, self.agent_id)
        if not snake or not snake.is_alive:
            return []
        
        # 找到目标
        target = ...  # 你的逻辑
        
        # 路径规划
        path = bfs_path_to_target(snake, target, frame)
        return path[:10] if path else []
```

## API 参考

### HungryShrimpClient

```python
client = HungryShrimpClient(
    base_url="http://localhost:3003",  # 游戏服务器地址
    api_key=None,                       # 可选API Key
    timeout=10,                         # 请求超时(秒)
)

# 创建房间
match_id = client.create_room("房间名", max_players=5)

# 加入房间
client.join_room(match_id, "agent_123", "MyBot")

# 获取游戏状态
frame = client.get_match(match_id, "agent_123")
print(f"状态: {frame.status}, Tick: {frame.current_tick}")

# 提交路径 (最多10个方向)
client.submit_path(match_id, "agent_123", ["up", "up", "right"])

# 获取比赛结果
result = client.get_result(match_id)
```

### Helper 函数

- `get_my_snake(frame, agent_id)` — 获取自己的蛇
- `get_safe_directions(snake, frame)` — 获取安全移动方向
- `bfs_path_to_target(snake, (x, y), frame)` — BFS路径规划
- `get_closest_item(snake, items)` — 获取最近的道具
