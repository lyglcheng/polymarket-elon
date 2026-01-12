#!/bin/bash

# Polymarket Elon Tracker - 启动管理脚本
# 支持 start, stop, status, restart 命令

# 应用配置
APP_NAME="polymarket-elon"
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON_CMD="python3.10"
APP_CMD="$PYTHON_CMD $APP_DIR/app.py"
PID_FILE="$APP_DIR/$APP_NAME.pid"
LOG_FILE="$APP_DIR/$APP_NAME.log"
PORT=8085

# 检查Python环境
check_python() {
    if ! command -v $PYTHON_CMD &> /dev/null; then
        echo "错误: $PYTHON_CMD 未安装"
        exit 1
    fi
}

# 检查依赖
check_deps() {
    if [ ! -f "$APP_DIR/requirements.txt" ]; then
        echo "警告: requirements.txt 文件不存在"
        return
    fi
    
    # 检查是否安装了所需依赖
    missing_deps=()
    while IFS= read -r dep; do
        if ! $PYTHON_CMD -c "import $dep" &> /dev/null; then
            missing_deps+=($dep)
        fi
    done < <(grep -v '^#' $APP_DIR/requirements.txt | grep -v '^$')
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        echo "警告: 缺少以下依赖: ${missing_deps[*]}"
        echo "建议运行: pip install -r requirements.txt"
    fi
}

# 启动应用
start() {
    check_python
    check_deps
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID &> /dev/null; then
            echo "$APP_NAME 已经在运行中 (PID: $PID)"
            return 0
        else
            echo "删除无效的PID文件"
            rm -f "$PID_FILE"
        fi
    fi
    
    echo "正在启动 $APP_NAME..."
    cd "$APP_DIR"
    nohup $APP_CMD > "$LOG_FILE" 2>&1 &
    PID=$!
    echo $PID > "$PID_FILE"
    
    # 等待应用启动
    sleep 2
    
    if ps -p $PID &> /dev/null; then
        echo "$APP_NAME 已成功启动 (PID: $PID)"
        echo "访问地址: http://localhost:$PORT"
        echo "日志文件: $LOG_FILE"
    else
        echo "启动失败，请查看日志文件: $LOG_FILE"
        rm -f "$PID_FILE"
        exit 1
    fi
}

# 停止应用
stop() {
    if [ ! -f "$PID_FILE" ]; then
        echo "$APP_NAME 未在运行中"
        return 0
    fi
    
    PID=$(cat "$PID_FILE")
    if ! ps -p $PID &> /dev/null; then
        echo "$APP_NAME 未在运行中，但PID文件存在"
        rm -f "$PID_FILE"
        return 0
    fi
    
    echo "正在停止 $APP_NAME (PID: $PID)..."
    kill $PID
    
    # 等待进程终止
    wait_time=0
    max_wait=10
    while ps -p $PID &> /dev/null && [ $wait_time -lt $max_wait ]; do
        sleep 1
        wait_time=$((wait_time + 1))
    done
    
    if ps -p $PID &> /dev/null; then
        echo "强制终止 $APP_NAME..."
        kill -9 $PID
        sleep 1
    fi
    
    rm -f "$PID_FILE"
    echo "$APP_NAME 已停止"
}

# 查看状态
status() {
    if [ ! -f "$PID_FILE" ]; then
        echo "$APP_NAME 未在运行中"
        return 1
    fi
    
    PID=$(cat "$PID_FILE")
    if ps -p $PID &> /dev/null; then
        echo "$APP_NAME 正在运行中 (PID: $PID)"
        echo "访问地址: http://localhost:$PORT"
        return 0
    else
        echo "$APP_NAME 未在运行中，但PID文件存在"
        return 1
    fi
}

# 重启应用
restart() {
    stop
    start
}

# 显示帮助信息
help() {
    echo "Polymarket Elon Tracker 启动管理脚本"
    echo "使用方法: $0 {start|stop|status|restart}"
    echo ""
    echo "命令说明:"
    echo "  start    启动应用"
    echo "  stop     停止应用"
    echo "  status   查看应用运行状态"
    echo "  restart  重启应用"
    echo "  help     显示帮助信息"
    echo ""
    echo "配置信息:"
    echo "  应用名称: $APP_NAME"
    echo "  应用目录: $APP_DIR"
    echo "  Python命令: $PYTHON_CMD"
    echo "  监听端口: $PORT"
    echo "  PID文件: $PID_FILE"
    echo "  日志文件: $LOG_FILE"
}

# 主程序
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    status)
        status
        ;;
    restart)
        restart
        ;;
    help|--help|-h)
        help
        ;;
    *)
        echo "使用方法: $0 {start|stop|status|restart}"
        echo "使用 '$0 help' 查看详细帮助"
        exit 1
        ;;
esac

exit 0