// 管理界面JavaScript

// 格式化日期时间
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// 计算总小时数
function calculateTotalHours(startDateString, endDateString) {
    const start = new Date(startDateString);
    const end = new Date(endDateString);
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    return parseFloat(diffHours.toFixed(2));
}

// 更新单个倒计时元素
function updateCountdownElement(element, endDateString) {
    const endDate = new Date(endDateString);
    
    function update() {
        const now = new Date();
        const timeLeft = endDate - now;
        
        if (timeLeft <= 0) {
            element.textContent = '已结束';
            return;
        }
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        element.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // 立即更新一次
    update();
    
    // 每秒更新一次
    const interval = setInterval(update, 1000);
    
    // 当元素被移除时清除定时器
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (!document.contains(element)) {
                clearInterval(interval);
                observer.disconnect();
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}

// 更新所有倒计时
function updateAllCountdowns() {
    const remainingTimeCells = document.querySelectorAll('.remaining-time');
    remainingTimeCells.forEach(cell => {
        const row = cell.closest('.track-row');
        if (row) {
            const trackingId = row.dataset.trackingId;
            const tracking = allTrackings.find(t => t.id === trackingId);
            if (tracking && tracking.isActive) {
                updateCountdownElement(cell, tracking.endDate);
            }
        }
    });
}

// 初始化页面
async function init() {
    await updateStats();
    await renderTrackings();
    // 启动实时更新检查
    startRealtimeUpdates();
    // 启动倒计时更新
    updateAllCountdowns();
}

// 统计类型枚举
const StatsFilter = {
    ALL: 'all',
    ACTIVE: 'active',
    INACTIVE: 'inactive'
};

// 当前过滤类型
let currentFilter = StatsFilter.ACTIVE;

// 数字动画函数
function animateNumber(element, targetValue, duration = 500) {
    const startValue = parseInt(element.textContent) || 0;
    const increment = (targetValue - startValue) / (duration / 16);
    let currentValue = startValue;
    
    const timer = setInterval(() => {
        currentValue += increment;
        if ((increment > 0 && currentValue >= targetValue) || (increment < 0 && currentValue <= targetValue)) {
            currentValue = targetValue;
            clearInterval(timer);
        }
        element.textContent = Math.round(currentValue);
    }, 16);
}

// 更新统计信息
async function updateStats() {
    try {
        const response = await fetch('/api/stats/summary');
        const data = await response.json();
        
        if (data.success) {
            const summary = data.data;
            
            // 更新统计数字，带有动画效果
            const totalElement = document.getElementById('total-trackings');
            const activeElement = document.getElementById('active-trackings');
            const inactiveElement = document.getElementById('inactive-trackings');
            
            animateNumber(totalElement, summary.total);
            animateNumber(activeElement, summary.active);
            animateNumber(inactiveElement, summary.inactive);
            
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

// 生成Polymarket链接
function generatePolymarketLink(title) {
    // 月份简写映射到完整拼写
    const monthMap = {
        'jan': 'january',
        'feb': 'february',
        'mar': 'march',
        'apr': 'april',
        'may': 'may',
        'jun': 'june',
        'jul': 'july',
        'aug': 'august',
        'sep': 'september',
        'oct': 'october',
        'nov': 'november',
        'dec': 'december'
    };
    
    // 处理标题：全部转小写，去掉#，用-连接，去掉?
    let processedTitle = title.toLowerCase();
    processedTitle = processedTitle.replace(/\#/g, ''); // 去掉#
    processedTitle = processedTitle.replace(/\?/g, ''); // 去掉?
    processedTitle = processedTitle.replace(/\s+/g, '-'); // 用-连接
    processedTitle = processedTitle.replace(/\,/g, ''); // 去掉逗号
    processedTitle = processedTitle.replace(/\.+/g, ''); // 去掉多余的点
    processedTitle = processedTitle.replace(/\-+/g, '-'); // 合并连续的- 
    
    // 去掉年份-2026
    processedTitle = processedTitle.replace(/\-2026$/, ''); // 去掉末尾的-2026
    
    // 在musk和tweets之间添加of
    processedTitle = processedTitle.replace(/musk\-tweets/, 'musk-of-tweets');
    
    // 将月份简写转换为完整拼写
    for (const [shortMonth, fullMonth] of Object.entries(monthMap)) {
        processedTitle = processedTitle.replace(new RegExp(`\-${shortMonth}\-`, 'g'), `-${fullMonth}-`);
        processedTitle = processedTitle.replace(new RegExp(`^${shortMonth}\-`, 'g'), `${fullMonth}-`);
        processedTitle = processedTitle.replace(new RegExp(`\-${shortMonth}$`, 'g'), `-${fullMonth}`);
    }
    
    // 移除 'from' 和 'to' 等多余的介词
    processedTitle = processedTitle.replace(/\-from\-/g, '-');
    processedTitle = processedTitle.replace(/\-to\-/g, '-');
    processedTitle = processedTitle.replace(/^from\-/g, '');
    processedTitle = processedTitle.replace(/\-to$/g, '');
    
    processedTitle = processedTitle.trim(); // 去掉首尾空格
    processedTitle = processedTitle.replace(/\-+/g, '-'); // 再次合并连续的- 
    
    // 构建完整链接
    return `https://polymarket.com/event/${processedTitle}`;
}

// 渲染任务列表
async function renderTrackingsList() {
    const tbody = document.getElementById('trackings-list');
    
    // 获取过滤后的任务
    const trackingsToShow = getFilteredTrackings();
    
    // 获取当前表格中已有的行
    const existingRows = tbody.querySelectorAll('.track-row');
    const existingRowMap = new Map();
    
    // 保存当前行的引用，键为trackingId
    existingRows.forEach(row => {
        const trackingId = row.dataset.trackingId;
        existingRowMap.set(trackingId, row);
    });
    
    // 创建新行的引用列表
    const newRowIds = new Set();
    
    // 遍历所有需要显示的任务
    for (const tracking of trackingsToShow) {
        const trackingId = tracking.id;
        newRowIds.add(trackingId);
        
        // 如果行已存在，更新它
        if (existingRowMap.has(trackingId)) {
            // 更新现有行的数据
            await updateTrackingRow(tracking, existingRowMap.get(trackingId));
            // 从映射中移除，剩余的将被删除
            existingRowMap.delete(trackingId);
        } else {
            // 创建新行
            await fetchStatsAndRenderRow(tracking, tbody);
        }
    }
    
    // 删除不再需要的行（包括对应的展开行）
    existingRowMap.forEach((row, trackingId) => {
        // 删除主行
        row.remove();
        // 删除对应的展开行
        const expandRow = document.getElementById(`expand-${trackingId}`);
        if (expandRow) {
            expandRow.remove();
        }
    });
}

// 更新单个跟踪行的数据
async function updateTrackingRow(tracking, row) {
    try {
        // 获取最新的统计数据
        const response = await fetch(`/api/trackings/${tracking.id}/stats`);
        const data = await response.json();
        
        let stats = {};
        if (data.success) {
            stats = data.data;
        }
        
        // 格式化数据
        const totalPosts = stats.cumulative || 0;
        const percentComplete = stats.percentComplete || 0;
        const daysTotal = stats.daysTotal || 0;
        const daysElapsed = stats.daysElapsed || 0;
        const daysRemaining = stats.daysRemaining || 0;
        
        // 获取当前行的单元格
        const cells = row.querySelectorAll('td');
        const statusCell = cells[2];
        const totalPostsCell = cells[3];
        const percentCell = cells[4];
        const totalHoursCell = cells[7];
        const remainingTimeCell = cells[8];
        
        // 更新状态
        statusCell.className = tracking.isActive ? 'status-active' : 'status-inactive';
        statusCell.textContent = tracking.isActive ? '活跃' : '已完成';
        
        // 更新数字，带有动画效果
        animateNumber(totalPostsCell, totalPosts);
        
        // 检查百分比单元格是否已经包含进度条结构，如果没有则转换
        let progressFill, progressText;
        if (percentCell.querySelector('.progress-bar-container')) {
            // 已有进度条结构，直接获取元素
            progressFill = percentCell.querySelector('.progress-bar-fill');
            progressText = percentCell.querySelector('.progress-bar-text');
            
            // 移除可能存在的旧percent-text元素
            const oldPercentText = percentCell.querySelector('.percent-text');
            if (oldPercentText) {
                oldPercentText.remove();
            }
        } else {
            // 没有进度条结构，转换为进度条格式
            const currentPercent = parseInt(percentCell.textContent) || 0;
            percentCell.innerHTML = `
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${currentPercent}%"></div>
                    <div class="progress-bar-text">${currentPercent}%</div>
                </div>
            `;
            progressFill = percentCell.querySelector('.progress-bar-fill');
            progressText = percentCell.querySelector('.progress-bar-text');
        }
        
        // 更新百分比（含进度条）
        let percentStart = parseInt(progressText.textContent) || 0;
        const percentTimer = setInterval(() => {
            percentStart += (percentComplete - percentStart) / 20;
            if (Math.abs(percentComplete - percentStart) < 0.5) {
                percentStart = percentComplete;
                clearInterval(percentTimer);
            }
            const roundedPercent = Math.round(percentStart);
            progressFill.style.width = roundedPercent + '%';
            progressText.textContent = roundedPercent + '%';
        }, 25);
        
        // 计算并显示总小时数
        const totalHours = calculateTotalHours(tracking.startDate, tracking.endDate);
        animateNumber(totalHoursCell, totalHours, 800);
        
        // 更新剩余时间倒计时
        if (tracking.isActive) {
            updateCountdownElement(remainingTimeCell, tracking.endDate);
        } else {
            remainingTimeCell.textContent = '已结束';
        }
    } catch (error) {
        console.error('Failed to update tracking row:', error);
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
        const totalPosts = stats.cumulative || 0;
        const percentComplete = stats.percentComplete || 0;
        const daysTotal = stats.daysTotal || 0;
        const daysElapsed = stats.daysElapsed || 0;
        const daysRemaining = stats.daysRemaining || 0;
        
        // 先创建行的基本结构，不包含数字内容
        row.innerHTML = `
            <td style="display: none;">${tracking.id.substring(0, 8)}...</td>
            <td>
                ${tracking.title} 
                <a href="${generatePolymarketLink(tracking.title)}" target="_blank" style="font-size: 12px; color: #0ea5e9; text-decoration: none; margin-left: 8px;">
                    🔗 polymarket
                </a>
            </td>
            <td class="${tracking.isActive ? 'status-active' : 'status-inactive'}">
                ${tracking.isActive ? '活跃' : '已完成'}
            </td>
            <td class="numeric-cell total-posts">0</td>
            <td class="numeric-cell percent-complete">
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: 0%"></div>
                    <div class="progress-bar-text">0%</div>
                </div>
            </td>
            <td class="start-time">${formatDateTime(tracking.startDate)}</td>
            <td class="end-time">${formatDateTime(tracking.endDate)}</td>
            <td class="numeric-cell total-hours">0</td>
            <td class="numeric-cell remaining-time">--:--:--</td>
            <td style="display: none;">
                <button class="btn" onclick="toggleDetails('${tracking.id}')">查看明细</button>
            </td>
        `;
        
        tbody.appendChild(row);
        
        // 对数字单元格应用动画效果
        const totalPostsCell = row.querySelector('.total-posts');
        const percentCompleteCell = row.querySelector('.percent-complete');
        const progressFill = percentCompleteCell.querySelector('.progress-bar-fill');
        const progressText = percentCompleteCell.querySelector('.progress-bar-text');
        const totalHoursCell = row.querySelector('.total-hours');
        const remainingTimeCell = row.querySelector('.remaining-time');
        
        // 为累计发帖数添加动画
        animateNumber(totalPostsCell, totalPosts);
        
        // 为百分比添加动画（含进度条）
        let percentStart = 0;
        const percentTimer = setInterval(() => {
            percentStart += (percentComplete - percentStart) / 20;
            if (Math.abs(percentComplete - percentStart) < 0.5) {
                percentStart = percentComplete;
                clearInterval(percentTimer);
            }
            const roundedPercent = Math.round(percentStart);
            progressFill.style.width = roundedPercent + '%';
            progressText.textContent = roundedPercent + '%';
        }, 25);
        
        // 计算并显示总小时数
        const totalHours = calculateTotalHours(tracking.startDate, tracking.endDate);
        animateNumber(totalHoursCell, totalHours, 800);
        
        // 为剩余时间添加倒计时
        if (tracking.isActive) {
            updateCountdownElement(remainingTimeCell, tracking.endDate);
        }
        
        // 创建展开行
        const expandRow = document.createElement('tr');
        expandRow.className = 'expandable-row';
        expandRow.id = `expand-${tracking.id}`;
        expandRow.innerHTML = `
            <td colspan="10">
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
    
    if (contentDiv.style.display !== 'none') {
        // 隐藏明细
        contentDiv.style.display = 'none';
        expandRow.style.display = 'none';
    } else {
        // 显示明细
        contentDiv.style.display = 'block';
        expandRow.style.display = 'table-row';
        
        // 无论是否已经加载了数据，都重新加载，确保显示最新数据
        await loadHourlyData(trackingId);
    }
}

// 加载小时数据
async function loadHourlyData(trackingId) {
    try {
        // 然后获取小时数据，更新图表
        const hourlyResponse = await fetch(`/api/trackings/${trackingId}/hourly`);
        const hourlyData = await hourlyResponse.json();
        
        if (hourlyData.success) {
            // 确保传递给renderHourlyChart的是小时数据数组
            const hourlyStats = hourlyData.data || [];
            renderHourlyChart(trackingId, hourlyStats);
        } else {
            // 如果请求失败，传递空数组，让renderHourlyChart处理无数据情况
            renderHourlyChart(trackingId, []);
        }
        
        // 最后获取最新的统计数据，更新表格里的累积发帖数
        // 放在后面执行，避免影响小时数据的加载
        const statsResponse = await fetch(`/api/trackings/${trackingId}/stats`);
        const statsData = await statsResponse.json();
        
        if (statsData.success) {
            const stats = statsData.data;
            const totalPosts = stats.cumulative || 0;
            
            // 更新表格里的累积发帖数
            const row = document.querySelector(`[data-tracking-id="${trackingId}"]`);
            if (row) {
                const totalPostsCell = row.querySelectorAll('td')[3];
                animateNumber(totalPostsCell, totalPosts);
            }
        }
    } catch (error) {
        console.error('Failed to load hourly data:', error);
        // 发生错误时，传递空数组，让renderHourlyChart处理无数据情况
        const chartDiv = document.getElementById(`chart-${trackingId}`);
        if (chartDiv) {
            chartDiv.innerHTML = '';
            const noDataDiv = document.createElement('div');
            noDataDiv.style.display = 'flex';
            noDataDiv.style.justifyContent = 'center';
            noDataDiv.style.alignItems = 'center';
            noDataDiv.style.height = '100px';
            noDataDiv.style.color = '#94a3b8';
            noDataDiv.style.fontSize = '14px';
            noDataDiv.textContent = '加载小时数据失败';
            chartDiv.appendChild(noDataDiv);
        }
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
    
    // 处理没有小时数据的情况
    if (sortedDates.length === 0) {
        const noDataDiv = document.createElement('div');
        noDataDiv.style.display = 'flex';
        noDataDiv.style.justifyContent = 'center';
        noDataDiv.style.alignItems = 'center';
        noDataDiv.style.height = '100px';
        noDataDiv.style.color = '#94a3b8';
        noDataDiv.style.fontSize = '14px';
        noDataDiv.textContent = '暂无小时发帖数据';
        chartDiv.appendChild(noDataDiv);
        return;
    }
    
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
        totalDiv.innerHTML = `当日总发帖数: <span class="daily-total">0</span>`;
        totalDiv.style.color = '#10b981';
        totalDiv.style.fontWeight = 'bold';
        totalDiv.style.margin = '0'; // 重置外边距
        totalDiv.style.fontSize = '14px'; // 调整字体大小
        dateHeaderContainer.appendChild(totalDiv);
        
        // 为当日总发帖数添加动画
        const dailyTotalSpan = totalDiv.querySelector('.daily-total');
        animateNumber(dailyTotalSpan, totalPosts);
        
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
let socket = null;
let isWebSocketConnected = false;

// 开始实时更新检查
function startRealtimeUpdates() {
    // 优先使用WebSocket
    initWebSocket();
    
    // 初始状态下，启动轮询作为后备
    if (!isWebSocketConnected) {
        startPolling();
    }
}

// 启动轮询
function startPolling() {
    if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
    }
    updateCheckInterval = setInterval(async () => {
        await checkForUpdates();
    }, 15000); // 15秒轮询间隔
    console.log('启动轮询机制');
}

// 停止轮询
function stopPolling() {
    if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
        updateCheckInterval = null;
        console.log('停止轮询机制，改用WebSocket');
    }
}

// 更新WebSocket状态显示
function updateWebSocketStatus(connected) {
    const statusIndicator = document.getElementById('websocket-status-indicator');
    const statusText = document.getElementById('websocket-status-text');
    
    isWebSocketConnected = connected;
    
    if (connected) {
        statusIndicator.style.background = '#10b981'; // 绿色
        statusText.textContent = 'WebSocket 已连接';
        // WebSocket连接成功，停止轮询
        stopPolling();
    } else {
        statusIndicator.style.background = '#ef4444'; // 红色
        statusText.textContent = 'WebSocket 断开';
        // WebSocket断开，启动轮询作为后备
        startPolling();
    }
}

// 初始化WebSocket连接
function initWebSocket() {
    try {
        // 创建WebSocket连接
        socket = io();
        
        // 连接成功事件
        socket.on('connect', () => {
            console.log('WebSocket连接成功');
            updateWebSocketStatus(true);
        });
        
        // 接收数据更新事件
        socket.on('data_update', (data) => {
            console.log('通过WebSocket接收到数据更新:', data);
            handleWebSocketDataUpdate(data);
        });
        
        // 接收服务器时间事件
        socket.on('server_time', (data) => {
            console.log('接收到服务器时间:', data);
            lastUpdateTime = data.last_update_time;
        });
        
        // 连接错误事件
        socket.on('connect_error', (error) => {
            console.error('WebSocket连接错误:', error);
            updateWebSocketStatus(false);
        });
        
        // 连接断开事件
        socket.on('disconnect', () => {
            console.log('WebSocket连接断开');
            updateWebSocketStatus(false);
        });
        
        // 连接超时事件
        socket.on('connect_timeout', () => {
            console.error('WebSocket连接超时');
            updateWebSocketStatus(false);
        });
    } catch (error) {
        console.error('初始化WebSocket失败:', error);
        updateWebSocketStatus(false);
    }
}

// 检查是否有更新（轮询备用机制）
async function checkForUpdates() {
    try {
        const response = await fetch('/api/check-updates');
        const data = await response.json();
        
        if (data.success) {
            const serverLastUpdate = data.last_update_time;
            
            // 如果服务器的更新时间大于本地的更新时间，说明有数据更新
            if (serverLastUpdate > lastUpdateTime && lastUpdateTime !== 0) {
                console.log('轮询检测到数据更新，开始更新页面...');
                await handleDataUpdate();
            }
            
            // 更新本地的最后更新时间
            lastUpdateTime = serverLastUpdate;
        }
    } catch (error) {
        console.error('轮询检查更新失败:', error);
    }
}

// 处理WebSocket数据更新
async function handleWebSocketDataUpdate(data) {
    try {
        // 检查数据是否有变化
        if (!data.data_changed) {
            console.log('WebSocket数据无变化，无需更新页面');
            return;
        }
        
        console.log('通过WebSocket更新数据:', data);
        
        // 保存旧数据用于比较
        const oldTrackings = [...allTrackings];
        const oldStats = await fetchStatsSummary();
        
        // 更新跟踪任务列表
        allTrackings = data.trackings;
    
        // 按活跃状态排序，活跃任务排在最上方
        allTrackings.sort((a, b) => {
            if (a.isActive && !b.isActive) return -1;
            if (!a.isActive && b.isActive) return 1;
            return 0;
        });
    
        // 直接使用WebSocket数据更新统计信息，避免重复HTTP请求
        updateStatsFromWebSocket(data.summary);
    
        // 重新渲染任务列表，会更新所有行的数据
        await renderTrackingsList();
    
        // 检查是否有展开的行，如果有，重新加载其小时数据
        const expandedRows = document.querySelectorAll('.expandable-row');
        for (const expandedRow of expandedRows) {
            const trackingId = expandedRow.id.replace('expand-', '');
            const contentDiv = document.getElementById(`content-${trackingId}`);
            if (contentDiv && contentDiv.style.display === 'block') {
                // 如果行是展开的，重新加载小时数据
                await loadHourlyData(trackingId);
            }
        }
            
        // 使用WebSocket数据作为新统计数据
        const newStats = data.summary;
            
        // 显示详细的更新通知，包含changes信息
        showDetailedUpdateNotification(oldStats, newStats, data.last_update, data.changes);
            
        // 只有当有实际变化时才播放语音警报
        if (data.changes && data.changes.length > 0) {
            playUpdateAlert();
        } else {
            // 检查统计数据是否有变化
            const hasStatsChanges = oldStats && newStats && 
                                  (oldStats.total !== newStats.total || 
                                   oldStats.active !== newStats.active || 
                                   oldStats.inactive !== newStats.inactive);
            if (hasStatsChanges) {
                playUpdateAlert();
            } else {
                console.log('数据变化微小，不播放语音警报');
            }
        }
        
        // 更新本地的最后更新时间
        lastUpdateTime = data.last_update;
    } catch (error) {
        console.error('处理WebSocket数据更新失败:', error);
    }
}

// 从WebSocket数据更新统计信息，避免HTTP请求
function updateStatsFromWebSocket(summary) {
    try {
        // 更新统计数字，带有动画效果
        const totalElement = document.getElementById('total-trackings');
        const activeElement = document.getElementById('active-trackings');
        const inactiveElement = document.getElementById('inactive-trackings');
        
        animateNumber(totalElement, summary.total);
        animateNumber(activeElement, summary.active);
        animateNumber(inactiveElement, summary.inactive);
        
        // 添加点击事件
        totalElement.parentElement.onclick = () => filterTrackings(StatsFilter.ALL);
        activeElement.parentElement.onclick = () => filterTrackings(StatsFilter.ACTIVE);
        inactiveElement.parentElement.onclick = () => filterTrackings(StatsFilter.INACTIVE);
        
        // 更新样式，突出显示当前过滤类型
        updateStatsStyle();
    } catch (error) {
        console.error('从WebSocket更新统计失败:', error);
    }
}

// 处理数据更新（轮询备用机制）
async function handleDataUpdate() {
    try {
        // 获取最新数据
        const response = await fetch('/api/latest-data');
        const data = await response.json();
        
        if (data.success) {
            // 检查数据是否有变化
            if (!data.data_changed) {
                console.log('轮询数据无变化，无需更新页面');
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
    
    // 重新渲染任务列表，会更新所有行的数据
    await renderTrackingsList();
    
    // 检查是否有展开的行，如果有，重新加载其小时数据
    const expandedRows = document.querySelectorAll('.expandable-row');
    for (const expandedRow of expandedRows) {
        const trackingId = expandedRow.id.replace('expand-', '');
        const contentDiv = document.getElementById(`content-${trackingId}`);
        if (contentDiv && contentDiv.style.display === 'block') {
            // 如果行是展开的，重新加载小时数据
            await loadHourlyData(trackingId);
        }
    }
            
    // 获取新统计数据用于比较
    const newStats = await fetchStatsSummary();
            
    // 显示详细的更新通知，包含changes信息
    showDetailedUpdateNotification(oldStats, newStats, data.data.last_update, data.data.changes);
            
    // 只有当有实际变化时才播放语音警报
    if (data.data.changes && data.data.changes.length > 0) {
        playUpdateAlert();
    } else {
        // 检查统计数据是否有变化
        const hasStatsChanges = oldStats && newStats && 
                              (oldStats.total !== newStats.total || 
                               oldStats.active !== newStats.active || 
                               oldStats.inactive !== newStats.inactive);
        if (hasStatsChanges) {
            playUpdateAlert();
        } else {
            console.log('数据变化微小，不播放语音警报');
        }
    }
        }
    } catch (error) {
        console.error('处理轮询数据更新失败:', error);
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
    let hasChanges = false;
    if (changes && changes.length > 0) {
        updateDetails += `<div style="margin: 10px 0; font-weight: bold; font-size: 14px;">详细变化:</div>`;
        hasChanges = true;
        
        changes.forEach(change => {
            updateDetails += `<div style="margin: 8px 0; padding: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 4px;">
                <div style="font-weight: bold; margin-bottom: 5px;">${change.title}</div>
                <div style="display: flex; justify-content: space-between;">
                    <span>累积发帖数:</span>
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
            hasChanges = true;
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
    
    // 如果没有具体的变化，显示通用更新信息
    if (!hasChanges) {
        updateDetails += `<div style="margin: 5px 0;">数据已更新，未检测到具体变化</div>`;
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
