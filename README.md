# Cashnote Coupon Extractor 🚀

A browser bookmarklet tool designed to automatically scan, analyze, and manage electronic coupons (Shinsegae/E-mart, Cultural Gift Certificates, Hyundai Department Store, Lotte Department Store, etc.) purchased on the Cashnote Marketplace.

[한국어 설명 (Korean Version)](./README_ko.md)

---

## Key Features

- **Image Analysis AI (Canvas API)**: Real-time verification of coupon usage status by analyzing 'Used' stamps at the pixel level.
- **Date-based Reliability Check**: Prevents analysis errors by categorizing orders placed before the system introduction as `⚠️ Manual Check Required`.
- **Barcode Viewer**: Instantly view unused Shinsegae/E-mart coupons in a slide-format barcode viewer for offline use.
- **Purchase History**: A dedicated dashboard to view purchased items and their statuses organized by date.
- **Smart Log Separation**: Hides detailed background logs to keep the result view clean, with an optional toggle for debugging.
- **Mobile Optimized**: Enhanced touch interface with double-tap zoom prevention for seamless use on smartphones.

---

## Usage (Remote Loader Method) 🌟

The Remote Loader method ensures you always use the latest version without manually updating your bookmark.

1. Create a new bookmark in your browser.
2. Copy the code below and paste it into the URL field.

```javascript
javascript:(function(){
  var script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/gh/krazyeom/cashnote/cashnote_remote.js?t=' + Date.now();
  document.body.appendChild(script);
})();
```

Once registered, just click this bookmark on the [Cashnote Order Page](https://market.cashnote.kr/orders).

---

## Supported Brands

- Shinsegae / E-mart Vouchers
- Cultural Gift Certificates (Culture Land)
- Hyundai Department Store Vouchers
- Lotte Department Store Vouchers
- Lotte Mobile Vouchers
- H.Point Vouchers

---

## Security & Disclaimer

- **Privacy**: This tool operates entirely within your local browser. No personal data or authentication tokens are transmitted to external servers.
- **Accuracy**: Due to the nature of image analysis, 100% accuracy is not guaranteed. Please manually verify important coupons.
- **Responsibility**: The developer is not responsible for any issues arising from the use of this tool.

---

## Version History

- **v6.1**: H.Point support added
- **v6.0**: About page added, Barcode engine optimized
- **v5.8**: Source code protection (Only obfuscated remote version hosted)
- **v5.7**: Simplified terminal UI (Borders removed)
- **v5.4**: Purchase history dashboard
- **v5.3**: Reliability logic based on order dates

---

**Made by [krazyeom](https://github.com/krazyeom)**
