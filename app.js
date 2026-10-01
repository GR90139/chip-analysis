function parseNumber(value) {
    if (value == null) return NaN;
    const str = String(value).replaceAll(',', '').trim();
    if (str === '') return NaN;
    const num = parseFloat(str);
    return Number.isFinite(num) ? num : NaN;
}

function parseDateSafe(value) {
    if (!value) return null;
    const str = String(value).trim().replace(/\./g, '/').replace(/-/g, '/');
    const parts = str.split('/');
    if (parts.length !== 3) return null;

    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);

    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

function formatLocalDate(date) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatDateLabel(dateText) {
    const d = parseDateSafe(dateText);
    if (!d) return dateText;
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

function findHeaderIndex(headers, keywords, exact = false) {
    return headers.findIndex(h => {
        const text = String(h || '').replace(/\s+/g, '').trim();
        if (exact) return keywords.includes(text);
        return keywords.some(k => text.includes(k));
    });
}

function requireIndex(headers, keywords, fieldName, exact = false) {
    const idx = findHeaderIndex(headers, keywords, exact);
    if (idx === -1) {
        throw new Error(`找不到欄位：${fieldName}`);
    }
    return idx;
}

function padScaleRange(values, paddingRatio = 0.2, fallback = 1) {
    const valid = values.filter(v => Number.isFinite(v));
    if (valid.length === 0) {
        return { min: -fallback, max: fallback };
    }

    let min = Math.min(...valid);
    let max = Math.max(...valid);

    if (min === max) {
        const base = Math.abs(min) || fallback;
        const pad = base * paddingRatio;
        return {
            min: min - pad,
            max: max + pad
        };
    }

    const range = max - min;
    const pad = range * paddingRatio;

    return {
        min: min - pad,
        max: max + pad
    };
}

function getLinePointStyle(dataLength) {
    if (dataLength > 20) {
        return {
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHitRadius: 16,
            pointBorderWidth: 0
        };
    }

    return {
        pointRadius: 3,
        pointHoverRadius: 5,
        pointHitRadius: 10,
        pointBorderWidth: 1
    };
}

function formatTooltipValue(label, value, unit = '') {
    const safeValue = Number.isFinite(value) ? value : 0;
    return `${label}: ${safeValue.toLocaleString()}${unit}`;
}

function buildCommonChartOptions({
    title,
    data,
    yTitle = '',
    y1Title = '加權指數',
    yMin = null,
    yMax = null,
    y1Min = null,
    y1Max = null,
    tooltipLabelFormatter
}) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        layout: {
            padding: {
                top: 8,
                right: 8,
                bottom: 0,
                left: 8
            }
        },
        interaction: {
            mode: 'index',
            intersect: false,
            axis: 'x'
        },
        plugins: {
            title: {
                display: true,
                text: title,
                padding: {
                    bottom: 8
                }
            },
            legend: {
                position: 'top',
                labels: {
                    boxWidth: 18,
                    usePointStyle: false
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    title: function (context) {
                        return `日期: ${data[context[0].dataIndex].date}`;
                    },
                    label: function (context) {
                        return tooltipLabelFormatter(context);
                    }
                }
            }
        },
        hover: {
            mode: 'index',
            intersect: false,
            axis: 'x'
        },
        scales: {
            x: {
                display: true,
                offset: true,
                ticks: {
                    maxRotation: 35,
                    minRotation: 35,
                    autoSkip: true,
                    maxTicksLimit: 12
                },
                title: {
                    display: true,
                    text: '日期'
                }
            },
            y: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: yTitle
                },
                min: yMin,
                max: yMax
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: y1Title
                },
                grid: {
                    drawOnChartArea: false
                },
                min: y1Min,
                max: y1Max
            }
        }
    };
}

function setDefaultDateRange() {
    if (!allData || allData.length === 0) return;

    const last = allData[allData.length - 1];
    const endDateObj = parseDateSafe(last.date) || new Date();

    const startIdx = Math.max(0, allData.length - 20);
    const first = allData[startIdx];
    const startDateObj = parseDateSafe(first.date) || endDateObj;

    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if (startInput) startInput.value = formatLocalDate(startDateObj);
    if (endInput) endInput.value = formatLocalDate(endDateObj);
}

function setQuickFilter(days) {
    if (!allData || allData.length === 0) return;

    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if (!startInput || !endInput) return;

    if (days === 0) {
        const firstDate = parseDateSafe(allData[0].date);
        const lastDate = parseDateSafe(allData[allData.length - 1].date);

        startInput.value = formatLocalDate(firstDate);
        endInput.value = formatLocalDate(lastDate);
    } else {
        const sliced = allData.slice(-days);
        const firstDate = parseDateSafe(sliced[0].date);
        const lastDate = parseDateSafe(allData[allData.length - 1].date);

        startInput.value = formatLocalDate(firstDate);
        endInput.value = formatLocalDate(lastDate);
    }

    applyDateFilter();
}

function applyDateFilter() {
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if (!startInput || !endInput) return;

    const startValue = startInput.value;
    const endValue = endInput.value;

    const startDate = new Date(new Date(startValue).setHours(0, 0, 0, 0));
    const endDate = new Date(new Date(endValue).setHours(23, 59, 59, 999));

    if (startDate > endDate) {
        alert('起始日期不能晚於結束日期！');
        return;
    }

    filteredData = allData.filter(item => {
        const itemDate = parseDateSafe(item.date);
        if (!itemDate || isNaN(itemDate)) return false;
        return itemDate >= startDate && itemDate <= endDate;
    });

    updateAllCharts();
}

function processDataAndCreateCharts(rawData) {
    if (typeof rawData === 'string') {
        try {
            rawData = JSON.parse(rawData);
        } catch (e) {
            console.error('rawData 不是合法 JSON 字串:', rawData);
            throw new Error('rawData 不是合法 JSON 字串');
        }
    }

    let rows = null;

    if (rawData && Array.isArray(rawData.values)) {
        rows = rawData.values;
    } else if (Array.isArray(rawData)) {
        rows = rawData;
    }

    if (!Array.isArray(rows) || rows.length < 3) {
        throw new Error(
            `rawData 格式不正確，至少需要表頭列、單位列與資料列；目前 rows = ${
                Array.isArray(rows) ? rows.length : '不是陣列'
            }`
        );
    }

    const headerRow1 = rows[0] || [];
    const headerRow2 = rows[1] || [];
    const dataRows = rows.slice(2);

    const mergedHeaders = headerRow1.map((h, i) => {
        const a = String(h || '').trim();
        const b = String(headerRow2[i] || '').trim();
        return `${a}${a && b ? ' ' : ''}${b}`.trim();
    });

    const dateIndex = requireIndex(mergedHeaders, ['日期', 'date'], '日期');
    const indexCloseIndex = requireIndex(mergedHeaders, ['收盤指數', '收盤', '指數'], '收盤指數');

    const foreignBuyIndex = requireIndex(
        mergedHeaders,
        ['外資（億元）', '外資(億元)', '外資（億）', '外資(億)', '外資'],
        '外資現貨'
    );

    const marginLongIndex = requireIndex(mergedHeaders, ['資增減'], '資增減');
    const marginShortIndex = requireIndex(mergedHeaders, ['券增減'], '券增減');

    const foreignFutureLongIndex = requireIndex(
        mergedHeaders,
        ['外資期貨未平倉 多單(口)', '外資期貨未平倉多單(口)', '多單(口)'],
        '外資期貨多單'
    );
    const foreignFutureShortIndex = requireIndex(
        mergedHeaders,
        ['外資期貨未平倉 空單(口)', '外資期貨未平倉空單(口)', '空單(口)'],
        '外資期貨空單'
    );

    const foreignOpCallIndex = requireIndex(
        mergedHeaders,
        ['外資選擇權買權未平倉', '外資選擇權\n買權未平倉'],
        '外資選擇權買權未平倉'
    );
    const foreignOpPutIndex = requireIndex(
        mergedHeaders,
        ['外資選擇權賣權未平倉', '外資選擇權\n賣權未平倉'],
        '外資選擇權賣權未平倉'
    );

    allData = dataRows.map(row => {
        const foreignBuy = parseNumber(row[foreignBuyIndex]);
        if (!Number.isFinite(foreignBuy)) return null;

        const dateText = String(row[dateIndex] || '').trim();
        if (!dateText) return null;

        return {
            date: dateText,
            foreignBuy: foreignBuy,
            marginLong: parseNumber(row[marginLongIndex]) || 0,
            marginShort: parseNumber(row[marginShortIndex]) || 0,
            foreignFutureLong: parseNumber(row[foreignFutureLongIndex]) || 0,
            foreignFutureShort: parseNumber(row[foreignFutureShortIndex]) || 0,
            foreignOpCall: parseNumber(row[foreignOpCallIndex]) || 0,
            foreignOpPut: parseNumber(row[foreignOpPutIndex]) || 0,
            indexClose: parseNumber(row[indexCloseIndex]) || 0,
            rawRow: row
        };
    }).filter(Boolean);

    allData.sort((a, b) => {
        const da = parseDateSafe(a.date);
        const db = parseDateSafe(b.date);
        return da - db;
    });

    setDefaultDateRange();
    applyDateFilter();
}

function updateAllCharts() {
    if (!filteredData || filteredData.length === 0) {
        alert('選定日期範圍內沒有資料！');
        return;
    }

    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });

    charts.foreign = createForeignChart(filteredData);
    charts.margin = createMarginChart(filteredData);
    charts.futures = createFuturesChart(filteredData);
    charts.options = createOptionsChart(filteredData);
}

function createForeignChart(data) {
    const ctx = document.getElementById('foreignChart').getContext('2d');
    const lineStyle = getLinePointStyle(data.length);

    const yRange = padScaleRange(data.map(d => d.foreignBuy), 0.2, 10);
    const y1Range = padScaleRange(data.map(d => d.indexClose), 0.2, 100);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => formatDateLabel(d.date)),
            datasets: [{
                label: '外資買賣超',
                data: data.map(d => d.foreignBuy),
                backgroundColor: data.map(d =>
                    d.foreignBuy >= 0 ? 'rgba(255, 99, 132, 0.7)' : 'rgba(75, 192, 192, 0.7)'
                ),
                borderColor: data.map(d =>
                    d.foreignBuy >= 0 ? 'rgba(255, 99, 132, 1)' : 'rgba(75, 192, 192, 1)'
                ),
                borderWidth: 1,
                yAxisID: 'y',
                categoryPercentage: 0.82,
                barPercentage: 0.9
            }, {
                label: '加權指數',
                type: 'line',
                data: data.map(d => d.indexClose),
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                tension: 0.2,
                fill: false,
                yAxisID: 'y1',
                ...lineStyle
            }]
        },
        options: buildCommonChartOptions({
            title: '外資買賣超',
            data,
            yTitle: '(億)',
            y1Title: '加權指數',
            yMin: yRange.min,
            yMax: yRange.max,
            y1Min: y1Range.min,
            y1Max: y1Range.max,
            tooltipLabelFormatter: function (context) {
                if (context.datasetIndex === 0) {
                    return formatTooltipValue('外資買賣超', context.parsed.y, ' 億');
                }
                return formatTooltipValue('加權指數', context.parsed.y, '');
            }
        })
    });
}

function createMarginChart(data) {
    const ctx = document.getElementById('marginChart').getContext('2d');
    const lineStyle = getLinePointStyle(data.length);

    const yValues = [
        ...data.map(d => d.marginLong),
        ...data.map(d => d.marginShort / 1000)
    ];
    const yRange = padScaleRange(yValues, 0.2, 10);
    const y1Range = padScaleRange(data.map(d => d.indexClose), 0.2, 100);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => formatDateLabel(d.date)),
            datasets: [{
                label: '資增減(億)',
                data: data.map(d => d.marginLong),
                backgroundColor: 'rgba(255, 99, 132, 0.7)',
                yAxisID: 'y',
                categoryPercentage: 0.82,
                barPercentage: 0.9
            }, {
                label: '券增減(千張)',
                data: data.map(d => d.marginShort / 1000),
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                yAxisID: 'y',
                categoryPercentage: 0.82,
                barPercentage: 0.9
            }, {
                label: '加權指數',
                type: 'line',
                data: data.map(d => d.indexClose),
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                tension: 0.2,
                fill: false,
                yAxisID: 'y1',
                ...lineStyle
            }]
        },
        options: buildCommonChartOptions({
            title: '資券變化',
            data,
            yTitle: '資券變化',
            y1Title: '加權指數',
            yMin: yRange.min,
            yMax: yRange.max,
            y1Min: y1Range.min,
            y1Max: y1Range.max,
            tooltipLabelFormatter: function (context) {
                if (context.datasetIndex === 0) {
                    return formatTooltipValue('資增減', context.parsed.y, ' 億');
                } else if (context.datasetIndex === 1) {
                    return formatTooltipValue('券增減', context.parsed.y, ' 千張');
                }
                return formatTooltipValue('加權指數', context.parsed.y, '');
            }
        })
    });
}

function createFuturesChart(data) {
    const ctx = document.getElementById('futuresChart').getContext('2d');
    const lineStyle = getLinePointStyle(data.length);

    const yValues = [
        ...data.map(d => d.foreignFutureLong),
        ...data.map(d => d.foreignFutureShort)
    ];
    const yRange = padScaleRange(yValues, 0.2, 100);
    const y1Range = padScaleRange(data.map(d => d.indexClose), 0.2, 100);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => formatDateLabel(d.date)),
            datasets: [{
                label: '期貨多單',
                data: data.map(d => d.foreignFutureLong),
                backgroundColor: 'rgba(255, 99, 132, 0.7)',
                yAxisID: 'y',
                categoryPercentage: 0.82,
                barPercentage: 0.9
            }, {
                label: '期貨空單',
                data: data.map(d => d.foreignFutureShort),
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                yAxisID: 'y',
                categoryPercentage: 0.82,
                barPercentage: 0.9
            }, {
                label: '加權指數',
                type: 'line',
                data: data.map(d => d.indexClose),
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                tension: 0.2,
                fill: false,
                yAxisID: 'y1',
                ...lineStyle
            }]
        },
        options: buildCommonChartOptions({
            title: '外資期貨部位',
            data,
            yTitle: '口數',
            y1Title: '加權指數',
            yMin: yRange.min,
            yMax: yRange.max,
            y1Min: y1Range.min,
            y1Max: y1Range.max,
            tooltipLabelFormatter: function (context) {
                if (context.datasetIndex === 0) {
                    return formatTooltipValue('多單', context.parsed.y, ' 口');
                } else if (context.datasetIndex === 1) {
                    return formatTooltipValue('空單', context.parsed.y, ' 口');
                }
                return formatTooltipValue('加權指數', context.parsed.y, '');
            }
        })
    });
}

function createOptionsChart(data) {
    const ctx = document.getElementById('optionsChart').getContext('2d');
    const lineStyle = getLinePointStyle(data.length);

    const yValues = [
        ...data.map(d => d.foreignOpCall),
        ...data.map(d => -d.foreignOpPut)
    ];
    const yRange = padScaleRange(yValues, 0.2, 10);
    const y1Range = padScaleRange(data.map(d => d.indexClose), 0.2, 100);

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => formatDateLabel(d.date)),
            datasets: [{
                label: '外資買權(億)',
                data: data.map(d => d.foreignOpCall),
                backgroundColor: 'rgba(255, 99, 132, 0.7)',
                yAxisID: 'y',
                categoryPercentage: 0.82,
                barPercentage: 0.9
            }, {
                label: '外資賣權(*-1)(億)',
                data: data.map(d => -d.foreignOpPut),
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                yAxisID: 'y',
                categoryPercentage: 0.82,
                barPercentage: 0.9
            }, {
                label: '加權指數',
                type: 'line',
                data: data.map(d => d.indexClose),
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                tension: 0.2,
                fill: false,
                yAxisID: 'y1',
                ...lineStyle
            }]
        },
        options: buildCommonChartOptions({
            title: '外資選擇權',
            data,
            yTitle: '億元',
            y1Title: '加權指數',
            yMin: yRange.min,
            yMax: yRange.max,
            y1Min: y1Range.min,
            y1Max: y1Range.max,
            tooltipLabelFormatter: function (context) {
                if (context.datasetIndex === 0) {
                    return formatTooltipValue('CALL', context.parsed.y, ' 億');
                } else if (context.datasetIndex === 1) {
                    return formatTooltipValue('PUT', Math.abs(context.parsed.y), ' 億');
                }
                return formatTooltipValue('加權指數', context.parsed.y, '');
            }
        })
    });
}