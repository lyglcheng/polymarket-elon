# 导入Flask模块
from flask import Flask, render_template, jsonify
from flask_apscheduler import APScheduler
from flask_socketio import SocketIO, emit
from database import get_all_trackings, get_tracking_stats, get_stats_summary, get_incomplete_trackings, insert_or_update_stats, insert_or_update_tracking
import json
import time
import requests
import sqlite3

# 创建Flask应用实例
app = Flask(__name__, 
            static_url_path='/static', 
            static_folder='html/static',
            template_folder='html')

# 配置APScheduler
app.config['SCHEDULER_API_ENABLED'] = True
app.config['SCHEDULER_TIMEZONE'] = 'Asia/Shanghai'
app.config['SECRET_KEY'] = 'your-secret-key-here'  # 用于SocketIO加密

# 创建APScheduler实例
scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

# 创建SocketIO实例
socketio = SocketIO(app, cors_allowed_origins='*')

# 全局变量
global last_returned_data, update_changes
last_returned_data = {
    'trackings': [],
    'summary': {}
}
update_changes = []
last_update_time = time.time()

# 定义主页路由（直接指向Elon管理界面）
@app.route('/')
def index():
    # 渲染elon.html模板
    return render_template('elon.html')

# 定义Elon管理界面路由（保持兼容）
@app.route('/elon')
def elon():
    # 渲染elon.html模板
    return render_template('elon.html')

# API端点：获取所有跟踪数据
@app.route('/api/trackings')
def api_get_trackings():
    trackings = get_all_trackings()
    return jsonify({'success': True, 'data': trackings})

# API端点：获取特定跟踪的统计数据
@app.route('/api/trackings/<string:tracking_id>/stats')
def api_get_tracking_stats(tracking_id):
    stats = get_tracking_stats(tracking_id)
    if stats:
        return jsonify({'success': True, 'data': stats})
    else:
        return jsonify({'success': False, 'message': 'Stats not found'}), 404

# API端点：获取统计摘要
@app.route('/api/stats/summary')
def api_get_stats_summary():
    summary = get_stats_summary()
    return jsonify({'success': True, 'data': summary})

# API端点：获取小时级别的统计数据
@app.route('/api/trackings/<string:tracking_id>/hourly')
def api_get_hourly_stats(tracking_id):
    from database import get_hourly_stats
    hourly_stats = get_hourly_stats(tracking_id)
    return jsonify({'success': True, 'data': hourly_stats})

# API端点：获取最新更新信息
@app.route('/api/check-updates')
def api_check_updates():
    global last_update_time
    return jsonify({
        'success': True,
        'last_update_time': last_update_time,
        'current_time': time.time()
    })

# 全局变量，存储上次返回的数据
last_returned_data = {
    'trackings': [],
    'summary': {
        'total': 0,
        'active': 0,
        'inactive': 0
    }
}

# API端点：获取最新数据
@app.route('/api/latest-data')
def api_get_latest_data():
    global last_returned_data, update_changes
    try:
        # 获取所有跟踪数据和统计信息
        current_trackings = get_all_trackings()
        current_summary = get_stats_summary()
        
        # 检查数据是否有变化
        data_changed = False
        
        # 比较统计数据
        if current_summary != last_returned_data['summary']:
            data_changed = True
        
        # 如果统计数据没有变化，检查跟踪数据数量是否有变化
        elif len(current_trackings) != len(last_returned_data['trackings']):
            data_changed = True
        
        # 如果数据没有变化，返回无变化状态
        if not data_changed:
            return jsonify({
                'success': True,
                'data_changed': False,
                'message': '数据无变化'
            })
        
        # 准备返回数据，包含更新变化
        return_data = {
            'success': True,
            'data_changed': True,
            'data': {
                'trackings': current_trackings,
                'summary': current_summary,
                'last_update': time.time(),
                'changes': update_changes.copy()  # 返回变化的副本
            }
        }
        
        # 更新上次返回的数据
        last_returned_data = {
            'trackings': current_trackings,
            'summary': current_summary
        }
        
        return jsonify(return_data)
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

# 定时任务：每30秒检查一次isComplete=0的数据
@scheduler.task('interval', id='check_incomplete_trackings', seconds=30, misfire_grace_time=900)
def check_incomplete_trackings():
    global last_update_time
    try:
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 开始检查未完成的跟踪任务...")
        
        # 获取isComplete=0的数据
        incomplete_trackings = get_incomplete_trackings()
        
        if incomplete_trackings:
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 发现 {len(incomplete_trackings)} 个未完成的跟踪任务")
            # 这里可以添加具体的更新逻辑
            # 目前只是模拟更新，实际项目中需要调用具体的更新API
            
        # 更新上次更新时间
        last_update_time = time.time()
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 未完成任务检查完成")
        
    except Exception as e:
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 检查未完成任务时出错: {e}")

# 添加一个简单的测试定时任务，每10秒发送一次WebSocket更新，用于调试
@scheduler.task('interval', id='test_websocket_update', seconds=10, misfire_grace_time=900)
def test_websocket_update():
    try:
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 测试WebSocket更新发送...")
        
        # 获取最新数据
        current_trackings = get_all_trackings()
        current_summary = get_stats_summary()
        
        # 准备更新数据
        update_data = {
            'trackings': current_trackings,
            'summary': current_summary,
            'last_update': time.time(),
            'changes': [],
            'data_changed': True
        }
        
        # 发送更新事件
        socketio.emit('data_update', update_data)
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 测试WebSocket更新发送成功")
        
    except Exception as socket_error:
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 测试WebSocket更新发送失败: {socket_error}")

# 全局变量，存储数据更新差异
update_changes = []

# 定时任务：每30秒从外部API获取数据并更新数据库
@scheduler.task('interval', id='update_external_data', seconds=30, misfire_grace_time=900)
def update_external_data():
    global last_update_time, update_changes
    try:
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 开始从外部API获取数据...")
        
        # 重置更新差异列表
        update_changes = []
        has_updates = False
        
        # 用户handle
        user_handle = 'elonmusk'
        
        # Step 1: 获取用户数据，提取trackings
        user_url = f'https://xtracker.polymarket.com/api/users/{user_handle}'
        response = requests.get(user_url)
        
        if response.status_code != 200:
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 错误：获取用户数据失败，状态码: {response.status_code}")
            return
        
        user_data = response.json()
        data = user_data.get('data', user_data)  # 兼容可能结构
        
        # 提取trackings列表
        trackings = data.get('trackings', [])
        if not trackings:
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 未找到trackings数据")
            return
        
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 找到 {len(trackings)} 个跟踪任务")
        
        # Step 2: 收集所有API返回的tracking ID
        api_tracking_ids = set()
        api_active_ids = set()
        
        # 先遍历所有API返回的任务，收集ID并更新它们的基本信息和状态
        for tracking in trackings:
            tracking_id = tracking['id']
            api_tracking_ids.add(tracking_id)
            
            # 收集活跃任务的ID
            if tracking.get('isActive', False):
                api_active_ids.add(tracking_id)
            
            # 更新tracking表的基本信息和isActive状态
            try:
                # 直接使用API返回的tracking数据更新数据库，包括isActive状态
                insert_or_update_tracking(tracking)
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 更新跟踪任务基本信息: {tracking_id}, isActive: {tracking.get('isActive')}")
            except Exception as e:
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 更新跟踪任务基本信息时出错 {tracking_id}: {e}")
                continue
        
        # Step 3: 只处理API返回的活跃任务，获取并更新详细统计数据
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 开始处理活跃任务，共 {len(api_active_ids)} 个")
        for tracking in trackings:
            tracking_id = tracking['id']
            
            # 只处理活跃任务
            if tracking_id not in api_active_ids:
                continue
            
            tracking_url = f'https://xtracker.polymarket.com/api/trackings/{tracking_id}?includeStats=true'
            
            try:
                resp = requests.get(tracking_url, timeout=10)
                if resp.status_code != 200:
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 错误：获取跟踪数据 {tracking_id} 失败，状态码: {resp.status_code}")
                    continue
                
                tracking_data = resp.json()
                data = tracking_data.get('data', tracking_data)  # 兼容可能结构
                
                # 再次更新tracking表，确保数据完整
                insert_or_update_tracking(data)
                
                # 检查是否有stats数据
                if 'stats' in data:
                    stats_data = data['stats']
                    # 更新stats表，并获取更新前后的cumulative值
                    previous_cumulative, current_cumulative = insert_or_update_stats(tracking_id, stats_data)
                    
                    # 比较更新前后的值，如果不同则记录差异
                    if previous_cumulative != current_cumulative:
                        has_updates = True
                        update_changes.append({
                            'tracking_id': tracking_id,
                            'title': tracking.get('title', 'Unknown'),
                            'previous_cumulative': previous_cumulative,
                            'current_cumulative': current_cumulative,
                            'change': current_cumulative - previous_cumulative
                        })
                        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 跟踪任务 {tracking_id} 的cumulative值已更新: {previous_cumulative} → {current_cumulative}")
                    
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 成功更新活跃跟踪任务 {tracking_id} 的统计数据")
                
            except Exception as e:
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 处理跟踪任务 {tracking_id} 时出错: {e}")
                continue
        
        # Step 4: 检查数据库中所有isActive=1的任务，哪些不在API返回列表中
        conn = sqlite3.connect('polymarket.db')
        cursor = conn.cursor()
        
        # 获取数据库中所有isActive=1的任务
        cursor.execute('SELECT id FROM polymarket_tracking WHERE isActive = 1')
        db_active_trackings = cursor.fetchall()
        
        for (tracking_id,) in db_active_trackings:
            if tracking_id not in api_tracking_ids:
                # 该任务在API中已不再返回，先调用接口更新数据，再标记为非活跃
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 处理不在API列表中的活跃任务: {tracking_id}")
                
                try:
                    # 调用API获取最新数据
                    tracking_url = f'https://xtracker.polymarket.com/api/trackings/{tracking_id}?includeStats=true'
                    resp = requests.get(tracking_url, timeout=10)
                    
                    if resp.status_code == 200:
                        tracking_data = resp.json()
                        data = tracking_data.get('data', tracking_data)  # 兼容可能结构
                        
                        # 更新tracking表
                        insert_or_update_tracking(data)
                        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 成功更新任务数据: {tracking_id}")
                        
                        # 如果有stats数据，更新stats表
                        if 'stats' in data:
                            stats_data = data['stats']
                            previous_cumulative, current_cumulative = insert_or_update_stats(tracking_id, stats_data)
                            if previous_cumulative != current_cumulative:
                                has_updates = True
                                update_changes.append({
                                    'tracking_id': tracking_id,
                                    'title': data.get('title', 'Unknown'),
                                    'previous_cumulative': previous_cumulative,
                                    'current_cumulative': current_cumulative,
                                    'change': current_cumulative - previous_cumulative
                                })
                                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 任务 {tracking_id} 的cumulative值已更新: {previous_cumulative} → {current_cumulative}")
                    else:
                        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 获取任务数据失败 {tracking_id}: 状态码 {resp.status_code}")
                except Exception as e:
                    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 调用API更新任务数据时出错 {tracking_id}: {e}")
                
                # 标记为非活跃
                cursor.execute('UPDATE polymarket_tracking SET isActive = 0 WHERE id = ?', (tracking_id,))
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 跟踪任务 {tracking_id} 已标记为非活跃")
                has_updates = True
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # 只有当有实际更新时才更新时间戳
        if has_updates:
            last_update_time = time.time()
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 外部数据更新完成！发现 {len(update_changes)} 个跟踪任务的cumulative值发生变化")
            
            # 通过WebSocket发送实时更新
            try:
                # 获取最新数据
                current_trackings = get_all_trackings()
                current_summary = get_stats_summary()
                
                # 准备更新数据
                update_data = {
                    'trackings': current_trackings,
                    'summary': current_summary,
                    'last_update': time.time(),
                    'changes': update_changes.copy(),
                    'data_changed': True
                }
                
                # 发送更新事件
                socketio.emit('data_update', update_data)
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 通过WebSocket发送了实时数据更新")
            except Exception as socket_error:
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] WebSocket发送更新失败: {socket_error}")
        else:
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 外部数据更新完成，没有检测到cumulative值变化")
        
    except Exception as e:
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 更新外部数据时出错: {e}")

# SocketIO事件：客户端连接
socketio.on('connect')
def on_connect():
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 客户端已连接")
    # 发送当前时间戳给新连接的客户端
    socketio.emit('server_time', {'last_update_time': last_update_time})

# SocketIO事件：客户端断开连接
socketio.on('disconnect')
def on_disconnect():
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 客户端已断开连接")

# 主函数
if __name__ == '__main__':
    # 使用socketio.run()运行应用，支持WebSocket
    socketio.run(app, host='0.0.0.0', port=8085, debug=True, allow_unsafe_werkzeug=True)