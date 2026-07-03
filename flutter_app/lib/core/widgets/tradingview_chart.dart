import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Embeds a TradingView Lightweight Chart via WebView.
/// Pass chart data as JSON and it renders a candlestick or line chart.
class TradingViewChart extends StatefulWidget {
  final String title;
  final List<TvDataPoint> data;
  final ChartType type;
  final Color lineColor;
  final double height;

  const TradingViewChart({
    super.key,
    this.title = '',
    required this.data,
    this.type = ChartType.line,
    this.lineColor = Colors.fuchsia,
    this.height = 220,
  });

  @override
  State<TradingViewChart> createState() => _TradingViewChartState();
}

class _TradingViewChartState extends State<TradingViewChart> {
  WebViewController? _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadHtmlString(_buildHtml());
  }

  String _buildHtml() {
    final jsonData = jsonEncode(widget.data.map((d) => d.toJson()).toList());
    final lineColorHex = '#${widget.lineColor.value.toRadixString(16).substring(2)}';
    final isCandlestick = widget.type == ChartType.candlestick;

    return '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
  <style>
    body { margin: 0; background: #000; }
    #chart { width: 100%; height: ${widget.height.toInt()}px; }
  </style>
</head>
<body>
  <div id="chart"></div>
  <script>
    const container = document.getElementById('chart');
    const chart = LightweightCharts.createChart(container, {
      layout: {
        background: { type: 'solid', color: '#000000' },
        textColor: '#999999',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        timeVisible: true,
      },
    });

    const data = $jsonData;

    const series = chart.add${isCandlestick ? 'CandlestickSeries' : 'LineSeries'}({
      ${isCandlestick ? "upColor: '#26a69a', downColor: '#ef5350', borderUpColor: '#26a69a', borderDownColor: '#ef5350'," : "color: '$lineColorHex', lineWidth: 2,"}
    });

    series.setData(data);
    chart.timeScale().fitContent();
  </script>
</body>
</html>
''';
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: widget.height,
      child: _controller != null ? WebViewWidget(controller: _controller!) : const SizedBox.shrink(),
    );
  }
}

enum ChartType { line, candlestick }

class TvDataPoint {
  final int time;
  final double? value;
  final double? open;
  final double? high;
  final double? low;
  final double? close;

  const TvDataPoint({
    required this.time,
    this.value,
    this.open,
    this.high,
    this.low,
    this.close,
  });

  Map<String, dynamic> toJson() {
    final m = <String, dynamic>{'time': time};
    if (value != null) m['value'] = value;
    if (open != null) m['open'] = open;
    if (high != null) m['high'] = high;
    if (low != null) m['low'] = low;
    if (close != null) m['close'] = close;
    return m;
  }

  factory TvDataPoint.value(int time, double value) =>
      TvDataPoint(time: time, value: value);

  factory TvDataPoint.candle(int time, double open, double high, double low, double close) =>
      TvDataPoint(time: time, open: open, high: high, low: low, close: close);
}
