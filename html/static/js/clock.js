// 时钟更新函数
function updateClocks() {
    // 获取当前UTC时间
    const now = new Date();
    const utcTime = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 
                            now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());
    
    // 计算各个时区的时间（基于UTC时间）
    
    // 北京时间 (UTC+8)
    const beijingTime = new Date(utcTime.getTime() + 8 * 60 * 60 * 1000);
    updateClock('beijing-time', 'beijing-date', beijingTime, 'beijing');
    
    // 美国PST时间 (UTC-8) - 西海岸（如加州）
    const pstTime = new Date(utcTime.getTime() - 8 * 60 * 60 * 1000);
    updateClock('pst-time', 'pst-date', pstTime, 'pst');
    
    // 美国EST时间 (UTC-5) - 东海岸（如纽约）
    const estTime = new Date(utcTime.getTime() - 5 * 60 * 60 * 1000);
    updateClock('est-time', 'est-date', estTime, 'est');
}

// 更新单个时钟的函数
function updateClock(timeElementId, dateElementId, date, prefix) {
    // 获取小时、分钟、秒
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    
    // 获取年、月、日
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
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