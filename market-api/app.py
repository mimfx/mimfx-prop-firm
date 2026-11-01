import os
import time
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
SITE_ORIGIN = os.getenv("SITE_ORIGIN", "https://nexora-funding.onrender.com")
CORS(app, resources={r"/v1/*": {"origins": [SITE_ORIGIN]}, r"/health": {"origins": [SITE_ORIGIN]}})

BIQUOTE_BASE = "https://biquote.io"
ALLOWED_SYMBOLS = {
    "EURUSD", "GBPUSD", "USDJPY", "USDCHF", "USDCAD", "AUDUSD", "NZDUSD",
    "EURGBP", "EURCHF", "EURJPY", "EURAUD", "EURNZD", "EURCAD",
    "GBPJPY", "GBPCHF", "GBPAUD", "GBPCAD", "GBPNZD",
    "AUDJPY", "AUDCHF", "AUDCAD", "AUDNZD", "NZDJPY", "NZDCHF",
    "NZDCAD", "CADJPY", "CADCHF", "CHFJPY",
    "XAUUSD", "XAGUSD",
    "US30", "US500", "NAS100", "US2000", "UK100", "GER40",
    "FRA40", "EU50", "JP225", "AUS200", "HK50",
    "BTCUSD", "ETHUSD", "BNBUSD", "XRPUSD", "SOLUSD",
    "ADAUSD", "DOGEUSD", "TRXUSD", "LTCUSD", "AVAXUSD",
}
_cache = {}
CACHE_SECONDS = 1.0
HTTP = requests.Session()
HTTP.headers.update({"User-Agent": "NEXORA-Funding-MarketData/0.1"})


def get_tick(symbol):
    now = time.monotonic()
    cached = _cache.get(symbol)
    if cached and now - cached["at"] < CACHE_SECONDS:
        return cached["data"]
    response = HTTP.get(f"{BIQUOTE_BASE}/api/{symbol}", timeout=8)
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, dict) or data.get("symbol", "").upper() != symbol:
        raise ValueError("Unexpected market-data response")
    if data.get("bid") is None or data.get("ask") is None or data.get("mid") is None:
        raise ValueError("Quote is missing bid/ask/mid")
    result = {
        "symbol": symbol,
        "bid": data["bid"],
        "ask": data["ask"],
        "mid": data["mid"],
        "spread": data.get("spread"),
        "timestamp": data.get("timestamp"),
        "marketState": data.get("marketState", "unknown"),
        "source": data.get("source", "BiQuote"),
        "provider": "BiQuote",
    }
    _cache[symbol] = {"at": now, "data": result}
    return result


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "NEXORA market data API", "mode": "read-only paper-trading feed"})


@app.get("/v1/quote/<symbol>")
def quote(symbol):
    symbol = symbol.upper().strip()
    if symbol not in ALLOWED_SYMBOLS:
        return jsonify({"error": "Unsupported symbol"}), 400
    try:
        return jsonify(get_tick(symbol))
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else 502
        return jsonify({"error": "Market-data provider rejected the request", "provider_status": status}), 502
    except (requests.RequestException, ValueError) as exc:
        return jsonify({"error": "Market data temporarily unavailable", "detail": str(exc)}), 502


@app.get("/v1/quotes")
def quotes():
    raw = request.args.getlist("symbols")
    symbols = []
    for item in raw:
        for symbol in item.split(","):
            symbol = symbol.strip().upper()
            if symbol and symbol not in symbols:
                symbols.append(symbol)
    if not symbols or len(symbols) > 20:
        return jsonify({"error": "Provide between 1 and 20 symbols"}), 400
    unsupported = [s for s in symbols if s not in ALLOWED_SYMBOLS]
    if unsupported:
        return jsonify({"error": "Unsupported symbol(s)", "symbols": unsupported}), 400
    results, errors = {}, {}
    for symbol in symbols:
        try:
            results[symbol] = get_tick(symbol)
        except (requests.RequestException, ValueError) as exc:
            errors[symbol] = str(exc)
    return jsonify({"quotes": results, "errors": errors})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "10000")))
