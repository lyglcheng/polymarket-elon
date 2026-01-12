// 管理界面JavaScript

// 初始化页面
async function init() {
    await updateStats();
    await renderTrackings();
    // 启动实时更新检查
    startRealtimeUpdates();
}

// 统计类型枚举
const StatsFilter = {
    ALL: 'all',
    ACTIVE: 'active',
    INACTIVE: 'inactive'
};

// 当前过滤类型
let currentFilter = StatsFilter.ACTIVE;

// 更新统计信息
async function updateStats() {
    try {
        const response = await fetch('/api/stats/summary');
        const data = await response.json();
        
        if (data.success) {
            const summary = data.data;
            
            // 更新统计数字
            const totalElement = document.getElementById('total-trackings');
            const activeElement = document.getElementById('active-trackings');
            const inactiveElement = document.getElementById('inactive-trackings');
            
            totalElement.textContent = summary.total;
            activeElement.textContent = summary.active;
            inactiveElement.textContent = summary.inactive;
            
            // 添加点击事件
            totalElement.parentElement.onclick = () => filterTrackings(StatsFilter.ALL);
            activeElement.parentElement.onclick = () => filterTrackings(StatsFilter.ACTIVE);
            inactiveElement.parentElement.onclick = () => filterTrackings(StatsFilter.INACTIVE);
            
            // 更新样式，突出显示当前过滤类型
            updateStatsStyle();
        }
    } catch (error) {
        console.error('Failed to update stats:', error);
    }
}

// 更新统计项样式
function updateStatsStyle() {
    const totalCard = document.getElementById('total-trackings').parentElement;
    const activeCard = document.getElementById('active-trackings').parentElement;
    const inactiveCard = document.getElementById('inactive-trackings').parentElement;
    
    // 重置所有样式
    [totalCard, activeCard, inactiveCard].forEach(card => {
        card.style.background = 'rgba(14, 165, 233, 0.1)';
        card.style.borderColor = 'rgba(14, 165, 233, 0.3)';
        card.style.cursor = 'pointer';
    });
    
    // 突出显示当前过滤类型
    if (currentFilter === StatsFilter.ALL) {
        totalCard.style.background = 'rgba(14, 165, 233, 0.3)';
        totalCard.style.borderColor = 'rgba(14, 165, 233, 0.6)';
    } else if (currentFilter === StatsFilter.ACTIVE) {
        activeCard.style.background = 'rgba(14, 165, 233, 0.3)';
        activeCard.style.borderColor = 'rgba(14, 165, 233, 0.6)';
    } else if (currentFilter === StatsFilter.INACTIVE) {
        inactiveCard.style.background = 'rgba(14, 165, 233, 0.3)';
        inactiveCard.style.borderColor = 'rgba(14, 165, 233, 0.6)';
    }
}

// 过滤跟踪任务
async function filterTrackings(filterType) {
    currentFilter = filterType;
    renderTrackingsList();
    updateStatsStyle();
    
    // 更新跟踪任务管理标题
    const titleElement = document.querySelector('.trackings-title');
    const trackingsToShow = getFilteredTrackings();
    const switchText = currentFilter === StatsFilter.ALL ? '只显示活跃' : '显示全部';
    titleElement.innerHTML = `跟踪任务管理 (${trackingsToShow.length}) <span style="font-size: 12px; cursor: pointer; color: #0ea5e9;" onclick="toggleAllTrackings()">${switchText}</span>`;
}

// 获取过滤后的任务
function getFilteredTrackings() {
    if (currentFilter === StatsFilter.ALL) {
        return allTrackings;
    } else if (currentFilter === StatsFilter.ACTIVE) {
        return allTrackings.filter(t => t.isActive);
    } else if (currentFilter === StatsFilter.INACTIVE) {
        return allTrackings.filter(t => !t.isActive);
    }
    return allTrackings;
}

// 渲染任务列表
async function renderTrackingsList() {
    const tbody = document.getElementById('trackings-list');
    tbody.innerHTML = '';
    
    // 获取过滤后的任务
    const trackingsToShow = getFilteredTrackings();
    
    // 渲染任务
    for (const tracking of trackingsToShow) {
        // 获取跟踪任务的统计数据
        await fetchStatsAndRenderRow(tracking, tbody);
    }
}

// 全局变量
let allTrackings = [];

// 渲染跟踪任务列表
async function renderTrackings() {
    try {
        const response = await fetch('/api/trackings');
        const data = await response.json();
        
        if (data.success) {
            // 保存所有跟踪任务
            allTrackings = data.data;
            
            // 按活跃状态排序，活跃任务排在最上方
            allTrackings.sort((a, b) => {
                if (a.isActive && !b.isActive) return -1;
                if (!a.isActive && b.isActive) return 1;
                return 0;
            });
            
            // 渲染任务列表
            renderTrackingsList();
        }
    } catch (error) {
        console.error('Failed to render trackings:', error);
    }
}

// 切换显示全部任务或根据当前过滤类型切换
function toggleAllTrackings() {
    if (currentFilter === StatsFilter.ALL) {
        // 如果当前显示全部，切换到只显示活跃
        filterTrackings(StatsFilter.ACTIVE);
    } else if (currentFilter === StatsFilter.ACTIVE || currentFilter === StatsFilter.INACTIVE) {
        // 如果当前显示活跃或已完成，切换到显示全部
        filterTrackings(StatsFilter.ALL);
    }
}

// 获取统计数据并渲染行
async function fetchStatsAndRenderRow(tracking, tbody) {
    try {
        const response = await fetch(`/api/trackings/${tracking.id}/stats`);
        const data = await response.json();
        
        let stats = {};
        if (data.success) {
            stats = data.data;
        }
        
        // 创建主数据行
        const row = document.createElement('tr');
        row.className = 'track-row';
        row.dataset.trackingId = tracking.id;
        
        // 格式化数据
        const totalPosts = stats.total || 0;
        const percentComplete = stats.percentComplete || 0;
        const daysTotal = stats.daysTotal || 0;
        const daysElapsed = stats.daysElapsed || 0;
        const daysRemaining = stats.daysRemaining || 0;
        
        row.innerHTML = `
            <td style="display: none;">${tracking.id.substring(0, 8)}...</td>
            <td>${tracking.title}</td>
            <td class="${tracking.isActive ? 'status-active' : 'status-inactive'}">
                ${tracking.isActive ? '活跃' : '已完成'}
            </td>
            <td>${totalPosts}</td>
            <td>${percentComplete}%</td>
            <td>${daysTotal}</td>
            <td>${daysElapsed}</td>
            <td>${daysRemaining}</td>
            <td style="display: none;">
                <button class="btn" onclick="toggleDetails('${tracking.id}')">查看明细</button>
            </td>
        `;
        
        tbody.appendChild(row);
        
        // 创建展开行
        const expandRow = document.createElement('tr');
        expandRow.className = 'expandable-row';
        expandRow.id = `expand-${tracking.id}`;
        expandRow.innerHTML = `
            <td colspan="9">
                <div class="expandable-content" id="content-${tracking.id}">
                    <h3>小时发帖统计</h3>
                    <div class="hourly-chart" id="chart-${tracking.id}"></div>
                </div>
            </td>
        `;
        
        tbody.appendChild(expandRow);
        
        // 为行添加点击事件
        row.addEventListener('click', () => {
            toggleDetails(tracking.id);
        });
        
    } catch (error) {
        console.error('Failed to fetch stats for tracking:', error);
    }
}

// 切换明细显示
async function toggleDetails(trackingId) {
    const contentDiv = document.getElementById(`content-${trackingId}`);
    const expandRow = document.getElementById(`expand-${trackingId}`);
    
    if (contentDiv.style.display === 'block') {
        // 隐藏明细
        contentDiv.style.display = 'none';
        expandRow.style.display = 'none';
    } else {
        // 显示明细
        contentDiv.style.display = 'block';
        expandRow.style.display = 'table-row';
        
        // 检查是否已经加载了数据
        const chartDiv = document.getElementById(`chart-${trackingId}`);
        if (chartDiv.children.length === 0) {
            // 加载小时数据
            await loadHourlyData(trackingId);
        }
    }
}

// 加载小时数据
async function loadHourlyData(trackingId) {
    try {
        const response = await fetch(`/api/trackings/${trackingId}/hourly`);
        const data = await response.json();
        
        if (data.success) {
            const hourlyData = data.data;
            renderHourlyChart(trackingId, hourlyData);
        }
    } catch (error) {
        console.error('Failed to load hourly data:', error);
    }
}

// 渲染小时发帖柱状图
function renderHourlyChart(trackingId, hourlyData) {
    const chartDiv = document.getElementById(`chart-${trackingId}`);
    chartDiv.innerHTML = '';
    
    // 按北京时间分组
    const dataByBeijingDate = {};
    hourlyData.forEach(item => {
        // 使用北京时间进行分组
        const beijingDate = new Date(item.beijingDate).toISOString().split('T')[0];
        if (!dataByBeijingDate[beijingDate]) {
            dataByBeijingDate[beijingDate] = [];
        }
        dataByBeijingDate[beijingDate].push(item);
    });
    
    // 获取所有日期并按倒序排序，最新日期在前面
    const sortedDates = Object.keys(dataByBeijingDate).sort((a, b) => {
        return new Date(b) - new Date(a);
    });
    
    // 获取当前北京时间
    const now = new Date();
    const nowBeijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const currentBeijingDate = nowBeijing.toISOString().split('T')[0];
    const currentBeijingHour = nowBeijing.getHours();
    
    // 遍历每个日期（按倒序，最新日期在最上方）
    for (const date of sortedDates) {
        const items = dataByBeijingDate[date];
        // 按北京时间正序排序，小时从0点到23点
        items.sort((a, b) => {
            return new Date(a.beijingDate) - new Date(b.beijingDate);
        });
        
        // 创建日期数据容器，让每日时间占一行
        const dateContainer = document.createElement('div');
        dateContainer.style.display = 'flex';
        dateContainer.style.flexDirection = 'column';
        dateContainer.style.gap = '5px'; // 减少间距
        dateContainer.style.marginBottom = '15px'; // 减少底部间距
        dateContainer.style.overflowX = 'auto';
        dateContainer.style.paddingBottom = '10px';
        chartDiv.appendChild(dateContainer);
        
        // 创建日期标题和总发帖数的容器
        const dateHeaderContainer = document.createElement('div');
        dateHeaderContainer.style.display = 'flex';
        dateHeaderContainer.style.alignItems = 'center';
        dateHeaderContainer.style.flexWrap = 'wrap';
        dateHeaderContainer.style.marginTop = '15px'; // 减少顶部间距
        dateHeaderContainer.style.marginBottom = '10px'; // 减少底部间距
        dateContainer.appendChild(dateHeaderContainer);
        
        // 创建日期标题
        const dateTitle = document.createElement('h4');
        dateTitle.textContent = `${date} (北京时间)`;
        dateTitle.style.color = '#0ea5e9';
        dateTitle.style.margin = '0'; // 重置外边距
        dateTitle.style.fontSize = '16px';
        dateTitle.style.marginRight = '20px'; // 与总发帖数保持间距
        dateHeaderContainer.appendChild(dateTitle);
        
        // 显示当日总发帖数，放在日期标题后方
        const totalPosts = items.reduce((sum, item) => sum + item.count, 0);
        const totalDiv = document.createElement('div');
        totalDiv.textContent = `当日总发帖数: ${totalPosts}`;
        totalDiv.style.color = '#10b981';
        totalDiv.style.fontWeight = 'bold';
        totalDiv.style.margin = '0'; // 重置外边距
        totalDiv.style.fontSize = '14px'; // 调整字体大小
        dateHeaderContainer.appendChild(totalDiv);
        
        // 创建小时数据行容器
        const hourlyRowWrapper = document.createElement('div');
        hourlyRowWrapper.style.position = 'relative';
        hourlyRowWrapper.style.background = 'rgba(30, 41, 59, 0.5)';
        hourlyRowWrapper.style.borderRadius = '8px';
        hourlyRowWrapper.style.overflow = 'hidden';
        hourlyRowWrapper.style.borderLeft = '2px solid #0ea5e9';
        dateContainer.appendChild(hourlyRowWrapper);
        
        // 创建小时数据行
        const hourlyRow = document.createElement('div');
        hourlyRow.style.display = 'flex';
        hourlyRow.style.alignItems = 'flex-end';
        hourlyRow.style.gap = '10px';
        hourlyRow.style.padding = '10px 20px 25px'; // 减少内边距
        hourlyRow.style.minHeight = '75px'; // 减少高度到原来的一半
        hourlyRow.style.position = 'relative';
        hourlyRowWrapper.appendChild(hourlyRow);
        
        // 创建时间刻度线（只保留线，移除标签，避免与小时标签冲突）
        for (let i = 0; i <= 24; i += 4) {
            const tick = document.createElement('div');
            tick.style.position = 'absolute';
            tick.style.bottom = '15px'; // 调整位置
            tick.style.left = `${(i / 24) * 100}%`;
            tick.style.width = '1px';
            tick.style.height = '6px'; // 减小刻度线高度
            tick.style.background = '#64748b';
            hourlyRow.appendChild(tick);
        }
        
        // 计算最大值用于缩放
        const counts = items.map(item => item.count);
        const maxCount = Math.max.apply(null, counts.concat([1]));
        
        // 创建一个小时到数据的映射，方便查找
        const hourDataMap = {};
        items.forEach(item => {
            const beijingDate = new Date(item.beijingDate);
            const hour = beijingDate.getHours();
            hourDataMap[hour] = item;
        });
        
        // 为每个小时（08:00-次日07:00）创建柱子，确保相同时间段对齐
        // 先显示08:00-23:00
        for (let hour = 8; hour < 24; hour++) {
            renderHourBar(hour);
        }
        // 再显示00:00-07:00
        for (let hour = 0; hour < 8; hour++) {
            renderHourBar(hour);
        }
        
        // 渲染单个小时柱子的辅助函数
        function renderHourBar(hour) {
            // 获取当前小时的数据，如果没有则使用默认值
            const item = hourDataMap[hour] || { count: 0 };
            const count = item.count;
            
            // 计算高度 (最大高度 60px，减少到原来的一半)
            const height = count > 0 ? Math.max(10, (count / maxCount) * 60) : 5;
            
            const barContainer = document.createElement('div');
            barContainer.style.flex = '1';
            barContainer.style.display = 'flex';
            barContainer.style.flexDirection = 'column';
            barContainer.style.alignItems = 'center';
            barContainer.style.gap = '3px'; // 减小间距
            barContainer.style.minWidth = '50px'; // 增加每个小时容器的宽度
            
            // 检查是否有数据
            const hasData = hour in hourDataMap;
            // 检查是否为当前小时（且为今天）
            const isCurrentHour = date === currentBeijingDate && hour === currentBeijingHour;
            
            // 只有当天的数据才显示特殊颜色，且特殊颜色显示在当前小时
            const showSpecialColor = date === currentBeijingDate && isCurrentHour;
            
            const bar = document.createElement('div');
            bar.className = 'hourly-bar';
            bar.style.height = `${height}px`;
            bar.style.width = '100%';
            bar.style.maxWidth = '35px';
            bar.dataset.hour = `${hour.toString().padStart(2, '0')}:00`;
            bar.dataset.count = count;
            bar.title = `${hour.toString().padStart(2, '0')}:00 - ${count} 帖 (北京时间)`;
            
            // 没有数据的小时显示为灰色
            if (!hasData) {
                bar.style.background = 'linear-gradient(to top, rgba(75, 85, 99, 0.4), rgba(75, 85, 99, 0.4))';
                bar.style.boxShadow = 'none';
            } 
            // 有数据的小时正常显示
            else {
                // 只有当天的当前小时用特殊颜色显示
                if (showSpecialColor) {
                    bar.style.background = 'linear-gradient(to top, rgba(239, 68, 68, 0.8), rgba(239, 68, 68, 0.8))';
                    bar.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.3)';
                }
            }
            
            // 添加小时标签
            const hourLabel = document.createElement('div');
            // 只有当天的当前小时用特殊颜色
            hourLabel.style.color = showSpecialColor ? '#ef4444' : (!hasData ? 'rgba(148, 163, 184, 0.5)' : '#94a3b8');
            hourLabel.style.fontSize = '11px'; // 增大1号
            hourLabel.style.fontWeight = isCurrentHour ? 'bold' : 'normal';
            hourLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
            
            // 添加发帖数标签，统一颜色，避免重影
            const countLabel = document.createElement('div');
            // 只有当天的当前小时用特殊颜色
            countLabel.style.color = showSpecialColor ? '#ef4444' : (!hasData ? 'rgba(14, 165, 233, 0.5)' : '#0ea5e9');
            countLabel.style.fontSize = '12px'; // 增大1号
            countLabel.style.fontWeight = 'bold';
            countLabel.textContent = count;
            countLabel.style.textAlign = 'center';
            countLabel.style.position = 'relative';
            countLabel.style.zIndex = '2';
            countLabel.style.background = 'rgba(15, 23, 42, 0.8)';
            countLabel.style.padding = '2px 4px';
            countLabel.style.borderRadius = '3px';
            countLabel.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.3)';
            countLabel.style.border = `1px solid ${showSpecialColor ? 'rgba(239, 68, 68, 0.3)' : (!hasData ? 'rgba(75, 85, 99, 0.3)' : 'rgba(14, 165, 233, 0.3)')}`;
            
            barContainer.appendChild(hourLabel);
            barContainer.appendChild(bar);
            barContainer.appendChild(countLabel);
            hourlyRow.appendChild(barContainer);
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

// 实时更新相关变量
let lastUpdateTime = 0;
let updateCheckInterval = null;

// 开始实时更新检查
function startRealtimeUpdates() {
    // 每5秒检查一次更新
    updateCheckInterval = setInterval(async () => {
        await checkForUpdates();
    }, 5000);
}

// 检查是否有更新
async function checkForUpdates() {
    try {
        const response = await fetch('/api/check-updates');
        const data = await response.json();
        
        if (data.success) {
            const serverLastUpdate = data.last_update_time;
            
            // 如果服务器的更新时间大于本地的更新时间，说明有数据更新
            if (serverLastUpdate > lastUpdateTime && lastUpdateTime !== 0) {
                console.log('检测到数据更新，开始更新页面...');
                await handleDataUpdate();
            }
            
            // 更新本地的最后更新时间
            lastUpdateTime = serverLastUpdate;
        }
    } catch (error) {
        console.error('检查更新失败:', error);
    }
}

// 处理数据更新
async function handleDataUpdate() {
    try {
        // 获取最新数据
        const response = await fetch('/api/latest-data');
        const data = await response.json();
        
        if (data.success) {
            // 检查数据是否有变化
            if (!data.data_changed) {
                console.log('数据无变化，无需更新页面');
                return;
            }
            
            // 保存旧数据用于比较
            const oldTrackings = [...allTrackings];
            const oldStats = await fetchStatsSummary();
            
            // 更新统计信息
            await updateStats();
            
            // 更新跟踪任务列表
            allTrackings = data.data.trackings;
            
            // 按活跃状态排序，活跃任务排在最上方
            allTrackings.sort((a, b) => {
                if (a.isActive && !b.isActive) return -1;
                if (!a.isActive && b.isActive) return 1;
                return 0;
            });
            
            // 重新渲染任务列表
            await renderTrackingsList();
            
            // 获取新统计数据用于比较
            const newStats = await fetchStatsSummary();
            
            // 显示详细的更新通知，包含changes信息
            showDetailedUpdateNotification(oldStats, newStats, data.data.last_update, data.data.changes);
            
            // 播放语音警报
            playUpdateAlert();
        }
    } catch (error) {
        console.error('处理数据更新失败:', error);
    }
}

// 播放数据更新语音警报
function playUpdateAlert() {
    try {
        console.log('开始播放语音警报...');
        
        // 检查浏览器是否支持语音合成
        if ('speechSynthesis' in window) {
            console.log('浏览器支持语音合成');
            
            // 检查语音合成引擎是否已加载
            if (window.speechSynthesis.getVoices().length === 0) {
                // 语音引擎可能未加载，添加事件监听器
                console.log('语音引擎未加载，等待加载完成...');
                window.speechSynthesis.onvoiceschanged = function() {
                    console.log('语音引擎加载完成，重新播放语音');
                    speakMessage('数据已更新');
                };
                // 给引擎一点时间加载
                setTimeout(() => {
                    if (window.speechSynthesis.getVoices().length > 0) {
                        speakMessage('数据已更新');
                    } else {
                        console.error('语音引擎加载超时');
                    }
                }, 1000);
            } else {
                // 语音引擎已加载，直接播放
                speakMessage('数据已更新');
            }
        } else {
            console.error('浏览器不支持语音合成');
        }
    } catch (error) {
        console.error('播放语音警报失败:', error);
    }
}

// 辅助函数：播放语音消息
function speakMessage(message) {
    try {
        // 创建语音合成实例
        const utterance = new SpeechSynthesisUtterance();
        utterance.text = message;
        utterance.lang = 'zh-CN';
        utterance.volume = 1.0; // 提高音量到最大
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        
        // 尝试选择中文语音
        const voices = window.speechSynthesis.getVoices();
        const chineseVoice = voices.find(voice => 
            voice.lang.includes('zh-CN') || voice.name.includes('Chinese') || voice.name.includes('中文')
        );
        
        if (chineseVoice) {
            utterance.voice = chineseVoice;
            console.log('使用中文语音:', chineseVoice.name);
        } else {
            console.log('未找到中文语音，使用默认语音');
        }
        
        // 播放语音
        window.speechSynthesis.speak(utterance);
        console.log('语音警报已播放:', message);
    } catch (error) {
        console.error('播放语音消息失败:', error);
    }
}

// 获取统计摘要
async function fetchStatsSummary() {
    try {
        const response = await fetch('/api/stats/summary');
        const data = await response.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('获取统计摘要失败:', error);
        return null;
    }
}

// 显示详细的更新通知
function showDetailedUpdateNotification(oldStats, newStats, updateTime, changes) {
    // 检查是否已经存在通知元素
    let notification = document.getElementById('update-notification');
    
    if (!notification) {
        // 创建通知元素
        notification = document.createElement('div');
        notification.id = 'update-notification';
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            font-size: 14px;
            font-weight: 500;
            max-width: 400px;
            max-height: 300px;
            overflow-y: auto;
        `;
        
        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: absolute;
            top: 10px;
            right: 10px;
        `;
        closeBtn.onclick = () => closeNotification();
        notification.appendChild(closeBtn);
        document.body.appendChild(notification);
    }
    
    // 格式化更新时间
    const formattedTime = new Date(updateTime * 1000).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    // 构建详细的更新信息
    let updateDetails = `<div style="margin-bottom: 10px; font-weight: bold; font-size: 16px;">数据已更新</div>`;
    updateDetails += `<div style="margin-bottom: 10px; font-size: 12px; opacity: 0.9;">更新时间: ${formattedTime}</div>`;
    
    // 显示跟踪任务的详细变化
    if (changes && changes.length > 0) {
        updateDetails += `<div style="margin: 10px 0; font-weight: bold; font-size: 14px;">详细变化:</div>`;
        
        changes.forEach(change => {
            updateDetails += `<div style="margin: 8px 0; padding: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 4px;">
                <div style="font-weight: bold; margin-bottom: 5px;">${change.title}</div>
                <div style="display: flex; justify-content: space-between;">
                    <span>累积值变化:</span>
                    <span>
                        <span style="color: #fbbf24;">${change.previous_cumulative}</span> 
                        → 
                        <span style="color: #34d399;">${change.current_cumulative}</span>
                        <span style="margin-left: 10px; color: ${change.change > 0 ? '#10b981' : '#ef4444'};">
                            ${change.change > 0 ? '+' : ''}${change.change}
                        </span>
                    </span>
                </div>
            </div>`;
        });
    }
    
    // 比较统计数据变化
    if (oldStats && newStats) {
        if (oldStats.total !== newStats.total || 
            oldStats.active !== newStats.active || 
            oldStats.inactive !== newStats.inactive) {
            updateDetails += `<div style="margin: 10px 0; font-weight: bold; font-size: 14px;">统计变化:</div>`;
        }
        if (oldStats.total !== newStats.total) {
            updateDetails += `<div style="margin: 5px 0; display: flex; justify-content: space-between;">
                <span>总跟踪任务:</span>
                <span><span style="color: #fbbf24;">${oldStats.total}</span> → <span style="color: #34d399;">${newStats.total}</span></span>
            </div>`;
        }
        if (oldStats.active !== newStats.active) {
            updateDetails += `<div style="margin: 5px 0; display: flex; justify-content: space-between;">
                <span>活跃跟踪任务:</span>
                <span><span style="color: #fbbf24;">${oldStats.active}</span> → <span style="color: #34d399;">${newStats.active}</span></span>
            </div>`;
        }
        if (oldStats.inactive !== newStats.inactive) {
            updateDetails += `<div style="margin: 5px 0; display: flex; justify-content: space-between;">
                <span>已完成跟踪任务:</span>
                <span><span style="color: #fbbf24;">${oldStats.inactive}</span> → <span style="color: #34d399;">${newStats.inactive}</span></span>
            </div>`;
        }
    }
    
    // 如果没有具体的统计数据变化，显示通用更新信息
    if (updateDetails.includes('→') === false) {
        updateDetails += `<div style="margin: 5px 0;">数据已更新，但统计指标无变化</div>`;
    }
    
    // 更新通知内容
    notification.innerHTML = updateDetails;
    
    // 显示通知
    notification.style.transform = 'translateX(0)';
    
    // 10秒后自动关闭
    setTimeout(() => {
        closeNotification();
    }, 10000);
}

// 显示更新通知（兼容旧调用）
function showUpdateNotification() {
    // 调用新的详细通知函数，使用默认值
    showDetailedUpdateNotification(null, null, Date.now() / 1000);
}

// 关闭通知
function closeNotification() {
    const notification = document.getElementById('update-notification');
    if (notification) {
        notification.style.transform = 'translateX(400px)';
        // 动画结束后移除元素
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}
