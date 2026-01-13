import sqlite3
import json
import os
from datetime import datetime

# 数据库文件路径
db_path = 'polymarket.db'

def init_db():
    """初始化数据库，创建表"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 创建polymarket_tracking表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS polymarket_tracking (
        id TEXT PRIMARY KEY,
        userId TEXT,
        title TEXT,
        startDate TEXT,
        endDate TEXT,
        target TEXT,
        marketLink TEXT,
        isActive BOOLEAN,
        metrics TEXT,
        config TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        user TEXT
    )
    ''')
    
    # 创建polymarket_tracking_stats表
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS polymarket_tracking_stats (
        trackingId TEXT PRIMARY KEY,
        total INTEGER,
        cumulative INTEGER,
        previous_cumulative INTEGER,
        pace INTEGER,
        percentComplete INTEGER,
        daysElapsed INTEGER,
        daysRemaining INTEGER,
        daysTotal INTEGER,
        isComplete BOOLEAN,
        daily TEXT,
        FOREIGN KEY (trackingId) REFERENCES polymarket_tracking (id)
    )
    ''')
    
    # 创建polymarket_hourly_stats表，用于存储小时级别的统计数据
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS polymarket_hourly_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        trackingId TEXT,
        statsDate TEXT,
        beijingDate TEXT,
        count INTEGER,
        cumulative INTEGER,
        FOREIGN KEY (trackingId) REFERENCES polymarket_tracking (id)
    )
    ''')
    
    conn.commit()
    conn.close()
    print("数据库初始化完成")

def insert_or_update_tracking(tracking_data):
    """插入或更新跟踪数据"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 检查记录是否存在
    cursor.execute('SELECT id FROM polymarket_tracking WHERE id = ?', (tracking_data['id'],))
    exists = cursor.fetchone() is not None
    
    # 准备数据
    user_json = json.dumps(tracking_data.get('user', {})) if tracking_data.get('user') else None
    metrics_json = json.dumps(tracking_data.get('metrics', {}))
    config_json = json.dumps(tracking_data.get('config', {}))
    
    if exists:
        # 更新记录
        cursor.execute('''
        UPDATE polymarket_tracking
        SET userId = ?, title = ?, startDate = ?, endDate = ?, target = ?, marketLink = ?, 
            isActive = ?, metrics = ?, config = ?, createdAt = ?, updatedAt = ?, user = ?
        WHERE id = ?
        ''', (
            tracking_data.get('userId'),
            tracking_data.get('title'),
            tracking_data.get('startDate'),
            tracking_data.get('endDate'),
            tracking_data.get('target'),
            tracking_data.get('marketLink'),
            tracking_data.get('isActive'),
            metrics_json,
            config_json,
            tracking_data.get('createdAt'),
            tracking_data.get('updatedAt'),
            user_json,
            tracking_data['id']
        ))
        print(f"更新跟踪数据: {tracking_data['id']}")
    else:
        # 插入记录
        cursor.execute('''
        INSERT INTO polymarket_tracking (
            id, userId, title, startDate, endDate, target, marketLink, 
            isActive, metrics, config, createdAt, updatedAt, user
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            tracking_data['id'],
            tracking_data.get('userId'),
            tracking_data.get('title'),
            tracking_data.get('startDate'),
            tracking_data.get('endDate'),
            tracking_data.get('target'),
            tracking_data.get('marketLink'),
            tracking_data.get('isActive'),
            metrics_json,
            config_json,
            tracking_data.get('createdAt'),
            tracking_data.get('updatedAt'),
            user_json
        ))
        print(f"插入跟踪数据: {tracking_data['id']}")
    
    conn.commit()
    conn.close()

def insert_hourly_stats(tracking_id, daily_stats):
    """插入小时级别的统计数据"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 先删除该tracking_id的所有小时数据
    cursor.execute('DELETE FROM polymarket_hourly_stats WHERE trackingId = ?', (tracking_id,))
    
    # 插入新的小时数据
    for hourly_data in daily_stats:
        utc_date = hourly_data.get('date')
        
        # 将UTC时间转换为北京时间 (UTC+8)
        from datetime import datetime, timedelta
        dt_utc = datetime.fromisoformat(utc_date.replace('Z', '+00:00'))
        dt_beijing = dt_utc + timedelta(hours=8)
        beijing_date = dt_beijing.isoformat()
        
        cursor.execute('''
        INSERT INTO polymarket_hourly_stats (trackingId, statsDate, beijingDate, count, cumulative)
        VALUES (?, ?, ?, ?, ?)
        ''', (
            tracking_id,
            hourly_data.get('date'),
            beijing_date,
            hourly_data.get('count'),
            hourly_data.get('cumulative')
        ))
    
    conn.commit()
    conn.close()
    print(f"插入小时数据: {tracking_id}, 共 {len(daily_stats)} 条记录")

def insert_or_update_stats(tracking_id, stats_data):
    """插入或更新统计数据"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 获取当前记录的cumulative值作为previous_cumulative
    cursor.execute('SELECT cumulative FROM polymarket_tracking_stats WHERE trackingId = ?', (tracking_id,))
    current_record = cursor.fetchone()
    previous_cumulative = current_record[0] if current_record else 0
    
    # 准备数据
    daily = stats_data.get('daily', [])
    daily_json = json.dumps(daily)
    
    # 检查记录是否存在
    exists = cursor.execute('SELECT trackingId FROM polymarket_tracking_stats WHERE trackingId = ?', (tracking_id,)).fetchone() is not None
    
    if exists:
        # 更新记录，保存当前cumulative值到previous_cumulative，然后设置新的cumulative值
        cursor.execute('''
        UPDATE polymarket_tracking_stats
        SET total = ?, previous_cumulative = ?, cumulative = ?, pace = ?, percentComplete = ?, 
            daysElapsed = ?, daysRemaining = ?, daysTotal = ?, isComplete = ?, daily = ?
        WHERE trackingId = ?
        ''', (
            stats_data.get('total'),
            previous_cumulative,
            stats_data.get('cumulative'),
            stats_data.get('pace'),
            stats_data.get('percentComplete'),
            stats_data.get('daysElapsed'),
            stats_data.get('daysRemaining'),
            stats_data.get('daysTotal'),
            stats_data.get('isComplete'),
            daily_json,
            tracking_id
        ))
        print(f"更新统计数据: {tracking_id}")
    else:
        # 插入记录，previous_cumulative初始化为0
        cursor.execute('''
        INSERT INTO polymarket_tracking_stats (
            trackingId, total, cumulative, previous_cumulative, pace, percentComplete, 
            daysElapsed, daysRemaining, daysTotal, isComplete, daily
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            tracking_id,
            stats_data.get('total'),
            stats_data.get('cumulative'),
            0,
            stats_data.get('pace'),
            stats_data.get('percentComplete'),
            stats_data.get('daysElapsed'),
            stats_data.get('daysRemaining'),
            stats_data.get('daysTotal'),
            stats_data.get('isComplete'),
            daily_json
        ))
        print(f"插入统计数据: {tracking_id}")
    
    # 如果任务已完成，将tracking表中的isActive设置为0
    if stats_data.get('isComplete'):
        cursor.execute('UPDATE polymarket_tracking SET isActive = 0 WHERE id = ?', (tracking_id,))
        print(f"任务 {tracking_id} 已完成，将isActive设置为0")
    
    conn.commit()
    conn.close()
    
    # 插入或更新小时数据
    insert_hourly_stats(tracking_id, daily)
    
    # 返回更新前后的cumulative值用于比较
    return previous_cumulative, stats_data.get('cumulative')

def get_all_trackings():
    """获取所有跟踪数据，活跃任务按剩余天数升序排列"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 联合查询跟踪数据和统计数据，按isActive降序、daysRemaining升序排列
    cursor.execute('''
    SELECT t.*, s.daysRemaining, s.isComplete
    FROM polymarket_tracking t
    LEFT JOIN polymarket_tracking_stats s ON t.id = s.trackingId
    ORDER BY 
        t.isActive DESC,  -- 活跃任务在前
        CASE 
            WHEN t.isActive = 1 AND s.daysRemaining IS NOT NULL THEN s.daysRemaining
            ELSE 99999  -- 非活跃或无剩余天数的任务排在后面
        END ASC
    ''')
    rows = cursor.fetchall()
    
    # 将结果转换为字典列表
    trackings = []
    for row in rows:
        tracking = {
            'id': row[0],
            'userId': row[1],
            'title': row[2],
            'startDate': row[3],
            'endDate': row[4],
            'target': row[5],
            'marketLink': row[6],
            'isActive': bool(row[7]),
            'metrics': json.loads(row[8]) if row[8] else {},
            'config': json.loads(row[9]) if row[9] else {},
            'createdAt': row[10],
            'updatedAt': row[11],
            'user': json.loads(row[12]) if row[12] else None,
            'daysRemaining': row[13],  # 添加剩余天数
            'isComplete': bool(row[14]) if row[14] is not None else False  # 添加完成状态
        }
        trackings.append(tracking)
    
    conn.close()
    return trackings

def get_tracking_stats(tracking_id):
    """获取特定跟踪的统计数据"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM polymarket_tracking_stats WHERE trackingId = ?', (tracking_id,))
    row = cursor.fetchone()
    
    if row:
        stats = {
            'trackingId': row[0],
            'total': row[1],
            'cumulative': row[2],
            'pace': row[3],
            'percentComplete': row[4],
            'daysElapsed': row[5],
            'daysRemaining': row[6],
            'daysTotal': row[7],
            'isComplete': bool(row[8]),
            'daily': json.loads(row[9]) if row[9] else []
        }
    else:
        stats = None
    
    conn.close()
    return stats

def get_stats_summary():
    """获取统计摘要"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 获取总跟踪数
    cursor.execute('SELECT COUNT(*) FROM polymarket_tracking')
    total = cursor.fetchone()[0]
    
    # 获取活跃跟踪数
    cursor.execute('SELECT COUNT(*) FROM polymarket_tracking WHERE isActive = 1')
    active = cursor.fetchone()[0]
    
    # 获取已完成跟踪数
    cursor.execute('SELECT COUNT(*) FROM polymarket_tracking WHERE isActive = 0')
    inactive = cursor.fetchone()[0]
    
    conn.close()
    
    return {
        'total': total,
        'active': active,
        'inactive': inactive
    }

def get_hourly_stats(tracking_id):
    """获取特定跟踪的小时级统计数据"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM polymarket_hourly_stats WHERE trackingId = ? ORDER BY statsDate', (tracking_id,))
    rows = cursor.fetchall()
    
    # 将结果转换为字典列表
    hourly_stats = []
    for row in rows:
        stats = {
            'id': row[0],
            'trackingId': row[1],
            'statsDate': row[2],
            'beijingDate': row[3],
            'count': row[4],
            'cumulative': row[5]
        }
        hourly_stats.append(stats)
    
    conn.close()
    return hourly_stats

def get_incomplete_trackings():
    """获取未完成的跟踪任务"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 查询isComplete=0的跟踪任务
    cursor.execute('''
    SELECT t.*, s.isComplete 
    FROM polymarket_tracking t 
    LEFT JOIN polymarket_tracking_stats s ON t.id = s.trackingId 
    WHERE s.isComplete = 0 OR s.isComplete IS NULL
    ''')
    rows = cursor.fetchall()
    
    # 将结果转换为字典列表
    trackings = []
    for row in rows:
        tracking = {
            'id': row[0],
            'userId': row[1],
            'title': row[2],
            'startDate': row[3],
            'endDate': row[4],
            'target': row[5],
            'marketLink': row[6],
            'isActive': bool(row[7]),
            'metrics': json.loads(row[8]) if row[8] else {},
            'config': json.loads(row[9]) if row[9] else {},
            'createdAt': row[10],
            'updatedAt': row[11],
            'user': json.loads(row[12]) if row[12] else None,
            'isComplete': bool(row[13]) if row[13] is not None else False
        }
        trackings.append(tracking)
    
    conn.close()
    return trackings

# 测试数据库功能
if __name__ == '__main__':
    init_db()
    print("数据库初始化完成")
    print("当前统计摘要:", get_stats_summary())