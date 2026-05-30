# Immich Fork — Bản tùy chỉnh cá nhân

> Fork từ [immich-app/immich](https://github.com/immich-app/immich), luôn theo bản **stable mới nhất**. Xem tài liệu gốc tại [immich.app](https://immich.app).

---

## Triết lý mở rộng

Mọi tính năng tùy chỉnh đều theo nguyên tắc **chỉ thêm mới, không sửa code gốc** để việc sync stable mới nhất luôn dễ dàng:

- ✅ Bảng DB mới hoàn toàn — không sửa schema gốc
- ✅ API endpoint mới trong `server/src/extensions/`
- ✅ Web route mới trong `web/src/routes/(user)/extensions/`
- ✅ Sidebar có 1 entry "Extensions" duy nhất — thêm tính năng mới không cần sửa sidebar
- ⚠️ File gốc bị sửa tối thiểu (chỉ 4 file, mỗi file 2 dòng):
  - `server/src/controllers/index.ts`
  - `server/src/services/index.ts`
  - `web/src/lib/route.ts`
  - `web/src/lib/components/shared-components/side-bar/user-sidebar.svelte`

### Sync stable mới nhất

```bash
# 1. Fetch tag mới nhất
git fetch immich vX.Y.Z
git reset --hard FETCH_HEAD

# 2. Restore 4 file tùy chỉnh
git checkout origin/develop -- \
  server/src/controllers/index.ts \
  server/src/services/index.ts \
  web/src/lib/route.ts \
  "web/src/lib/components/shared-components/side-bar/user-sidebar.svelte"

# 3. Kiểm tra extension code còn tương thích không
#    (chủ yếu là import DB type và MapLibre API)
pnpm install && pnpm build
```

> Extension code được cô lập hoàn toàn trong `server/src/extensions/` và `web/src/routes/(user)/extensions/`.
> Khi sync version mới, chỉ cần kiểm tra lại phần extension — code gốc immich không bị ảnh hưởng.

---

## Tính năng tùy chỉnh

### 🗺️ Bản đồ nhiệt (`/extensions/heatmap`)

Hiển thị mật độ ảnh theo vị trí GPS dưới dạng heatmap.

**Cách hoạt động:**
- Đọc `latitude` / `longitude` từ bảng `asset_exif` có sẵn — không cần bảng mới
- Gom nhóm theo 3 chữ số thập phân (~100m) và đếm số ảnh mỗi điểm
- Render bằng MapLibre GL heatmap layer built-in, dùng cùng map style với trang `/map` của immich

**API:** `GET /api/extensions/heatmap/points`
```json
[{ "lat": 10.762, "lng": 106.660, "count": 42 }]
```

**Files:**
```
server/src/extensions/heatmap/
├── heatmap.service.ts     # Query asset_exif
└── heatmap.controller.ts  # GET /api/extensions/heatmap/points

web/src/routes/(user)/extensions/
├── +page.ts               # Extensions index
├── +page.svelte           # Grid tính năng
└── heatmap/
    ├── +page.ts           # Load data
    └── +page.svelte       # MapLibre heatmap
```

---
<br/>
<a href="https://immich.app">
<img src="design/immich-screenshots.png" title="Main Screenshot">
</a>
<br/>

<p align="center">
  <a href="readme_i18n/README_ca_ES.md">Català</a>
  <a href="readme_i18n/README_es_ES.md">Español</a>
  <a href="readme_i18n/README_fr_FR.md">Français</a>
  <a href="readme_i18n/README_it_IT.md">Italiano</a>
  <a href="readme_i18n/README_ja_JP.md">日本語</a>
  <a href="readme_i18n/README_ko_KR.md">한국어</a>
  <a href="readme_i18n/README_de_DE.md">Deutsch</a>
  <a href="readme_i18n/README_nl_NL.md">Nederlands</a>
  <a href="readme_i18n/README_tr_TR.md">Türkçe</a>
  <a href="readme_i18n/README_zh_CN.md">简体中文</a>
  <a href="readme_i18n/README_zh_TW.md">正體中文</a>
  <a href="readme_i18n/README_uk_UA.md">Українська</a>
  <a href="readme_i18n/README_ru_RU.md">Русский</a>
  <a href="readme_i18n/README_pt_BR.md">Português Brasileiro</a>
  <a href="readme_i18n/README_sv_SE.md">Svenska</a>
  <a href="readme_i18n/README_ar_JO.md">العربية</a>
  <a href="readme_i18n/README_vi_VN.md">Tiếng Việt</a>
  <a href="readme_i18n/README_th_TH.md">ภาษาไทย</a>
</p>


> [!NOTE]
> Tài liệu gốc của immich: https://immich.app/
