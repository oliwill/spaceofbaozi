---
title: "Unsplash 每天随机获取一张图片"
date: "2024-07-12"
draft: false
---
```markup
import os
import sys
from datetime import datetime
from typing import Optional

import requests
from flask import Flask, request, redirect, url_for, render_template_string


UNSPLASH_API_KEY = os.getenv("UNSPLASH_API_KEY", "UNSPLASH_API_KEY")


def get_random_image_url(category: Optional[str] = None, width: int = 1600, height: int = 900) -> Optional[str]:
    """
    从 Unsplash 随机获取一张图片的原始 URL，并附带尺寸裁剪参数。

    :param category: 可选类目关键词（用于 query 检索）
    :param width: 目标宽度
    :param height: 目标高度
    :return: 图片 URL 或 None
    """
    url = "https://api.unsplash.com/photos/random"
    params = {
        "orientation": "landscape",
    }
    if category:
        params["query"] = category

    headers = {
        "Authorization": f"Client-ID {UNSPLASH_API_KEY}"
    }

    try:
        response = requests.get(url, params=params, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
        raw = data.get("urls", {}).get("raw")
        if not raw:
            return None
        # raw 支持添加处理参数
        return f"{raw}&w={width}&h={height}&fit=crop"
    except requests.exceptions.RequestException as e:
        print(f"Unsplash request error: {e}", file=sys.stderr)
        if hasattr(e, 'response') and e.response is not None:
            if e.response.status_code == 401:
                print("可能是无效的 API Key。", file=sys.stderr)
            elif e.response.status_code == 403:
                print("可能是权限不足或达到接口限额。", file=sys.stderr)
        return None


app = Flask(__name__)


CATEGORIES = [
    "nature", "technology", "people", "animals", "travel", "food",
    "architecture", "abstract", "sports", "fashion", "business", "art",
    "minimal", "macro", "nightlife", "health"
]


INDEX_HTML = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unsplash 图片生成器</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 24px; background: #0d1117; color: #e6edf3; }
        .container { max-width: 920px; margin: 0 auto; }
        h1 { margin: 0 0 16px; font-size: 22px; }
        form { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 16px; }
        select, input[type=number] { padding: 8px; border-radius: 6px; border: 1px solid #30363d; background: #161b22; color: #e6edf3; }
        button { padding: 10px 16px; border: 0; border-radius: 6px; background: #238636; color: #fff; cursor: pointer; }
        button:hover { background: #2ea043; }
        .msg { margin: 12px 0; color: #f0b429; }
        .img-wrap { margin-top: 16px; }
        img { max-width: 100%; height: auto; border-radius: 10px; border: 1px solid #30363d; }
        .row { display: flex; gap: 12px; flex-wrap: wrap; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        label { font-size: 13px; color: #9da7b1; }
    </style>
    <link rel="icon" href="data:">
    <meta name="color-scheme" content="dark light">
    <meta name="referrer" content="no-referrer">
    <script>
    function copyImageUrl() {
        const input = document.getElementById('imageUrl');
        if (!input) return;
        input.select();
        input.setSelectionRange(0, 99999);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(input.value).then(function () {
                alert('已复制 URL');
            }).catch(function () {
                try {
                    document.execCommand('copy');
                    alert('已复制 URL');
                } catch (e) {
                    alert('复制失败，请手动复制');
                }
            });
        } else {
            try {
                document.execCommand('copy');
                alert('已复制 URL');
            } catch (e) {
                alert('复制失败，请手动复制');
            }
        }
    }
    </script>
</head>
<body>
    <div class="container">
        <h1>Unsplash 图片生成器</h1>
        <form method="post" action="{{ url_for('generate') }}">
            <div class="row">
                <div class="field">
                    <label for="category">照片类目</label>
                    <select id="category" name="category">
                        <option value="">随机（不指定）</option>
                        {% for c in categories %}
                            <option value="{{ c }}" {% if c == selected %}selected{% endif %}>{{ c }}</option>
                        {% endfor %}
                    </select>
                </div>
                {% if image_url %}
                <div class="field" style="flex: 1; min-width: 320px;">
                    <label>图片地址</label>
                    <div class="row" style="gap: 8px; align-items: center;">
                        <input id="imageUrl" type="text" value="{{ image_url }}" readonly onclick="copyImageUrl()" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid #30363d; background: #161b22; color: #e6edf3;">
                        <button type="button" onclick="copyImageUrl()">复制</button>
                    </div>
                </div>
                {% endif %}
                <div class="field">
                    <label for="width">宽度</label>
                    <input id="width" name="width" type="number" value="{{ width }}" min="320" max="3840" step="10" />
                </div>
                <div class="field">
                    <label for="height">高度</label>
                    <input id="height" name="height" type="number" value="{{ height }}" min="240" max="2160" step="10" />
                </div>
                <div class="field" style="justify-content: flex-end;">
                    <label>&nbsp;</label>
                    <button type="submit">生成图片</button>
                </div>
            </div>
        </form>

        {% if message %}
            <div class="msg">{{ message }}</div>
        {% endif %}

        {% if image_url %}
            <div class="img-wrap">
                <a href="{{ image_url }}" target="_blank" rel="noopener noreferrer">在新标签页打开原图</a>
                <div><img src="{{ image_url }}" alt="Generated from Unsplash"/></div>
            </div>
        {% endif %}
    </div>
</body>
</html>
"""


@app.get("/")
def index():
    return render_template_string(INDEX_HTML, categories=CATEGORIES, selected="", image_url=None, message=None, width=1600, height=900)


@app.post("/generate")
def generate():
    category = request.form.get("category") or None
    try:
        width = int(request.form.get("width", 1600))
        height = int(request.form.get("height", 900))
    except ValueError:
        width, height = 1600, 900

    if not UNSPLASH_API_KEY:
        message = "未配置 UNSPLASH_API_KEY，请在环境变量中设置。"
        return render_template_string(INDEX_HTML, categories=CATEGORIES, selected=category or "", image_url=None, message=message, width=width, height=height)

    image_url = get_random_image_url(category=category, width=width, height=height)
    if not image_url:
        return render_template_string(INDEX_HTML, categories=CATEGORIES, selected=category or "", image_url=None, message="获取图片失败，请稍后重试。", width=width, height=height)

    return render_template_string(INDEX_HTML, categories=CATEGORIES, selected=category or "", image_url=image_url, message=None, width=width, height=height)


if __name__ == "__main__":
    # Web GUI 模式
    port = int(os.getenv("PORT", "5000"))
    host = os.getenv("HOST", "127.0.0.1")
    print(f"Starting web on http://{host}:{port}")
    app.run(host=host, port=port, debug=False)
```
