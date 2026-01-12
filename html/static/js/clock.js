// 时钟更新函数
function updateClocks() {
    // 获取当前时间
    const now = new Date();
    
    // 更新北京时间 (UTC+8)
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    updateClock('beijing-time', 'beijing-date', beijingTime, 'beijing');
    
    // 更新PST时间 (UTC-8)
    const pstTime = new Date(now.getTime() - 8 * 60 * 60 * 1000);
    updateClock('pst-time', 'pst-date', pstTime, 'pst');
    
    // 更新EST时间 (UTC-5)
    const estTime = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    updateClock('est-time', 'est-date', estTime, 'est');
}

// 更新单个时钟的函数
function updateClock(timeElementId, dateElementId, date, prefix) {
    // 获取小时、分钟、秒
    const hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const seconds = date.getUTCSeconds();
    
    // 获取年、月、日
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    
    // 更新数字时间显示
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById(timeElementId).textContent = timeString;
    
    // 更新日期显示
    document.getElementById(dateElementId).textContent = `${year}年${month}月${day}日`;
    
    // 更新钟表指针
    updateClockHands(hours, minutes, seconds, prefix);
}

// 更新钟表指针角度的函数
function updateClockHands(hours, minutes, seconds, prefix) {
    // 计算指针角度
    const secondDegrees = (seconds / 60) * 360 + 90;
    const minuteDegrees = (minutes / 60) * 360 + (seconds / 60) * 6 + 90;
    const hourDegrees = (hours / 12) * 360 + (minutes / 60) * 30 + 90;
    
    // 更新指针旋转
    const hourHand = document.getElementById(`${prefix}-hour`);
    const minuteHand = document.getElementById(`${prefix}-minute`);
    const secondHand = document.getElementById(`${prefix}-second`);
    
    if (hourHand) hourHand.style.transform = `rotate(${hourDegrees}deg)`;
    if (minuteHand) minuteHand.style.transform = `rotate(${minuteDegrees}deg)`;
    if (secondHand) secondHand.style.transform = `rotate(${secondDegrees}deg)`;
}

// 页面加载完成后开始更新时钟
window.addEventListener('load', function() {
    // 立即更新一次
    updateClocks();
    
    // 每秒更新一次
    setInterval(updateClocks, 1000);
});