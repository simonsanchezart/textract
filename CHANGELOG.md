# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.2.0] - 2026-09-26
### :sparkles: New Features
- [`5b1910e`](https://github.com/simonsanchezart/textract/commit/5b1910e9a98ec8e7a0355a95b3fc013a4d207c9e) - implement support from drag-n-drop from browser/temp sources *(PR [#32](https://github.com/simonsanchezart/textract/pull/32) by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`2029d24`](https://github.com/simonsanchezart/textract/commit/2029d24a0cf9c95d63d81652af163ef1276ffff0) - don't select image on mark click by default *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`fd9dee0`](https://github.com/simonsanchezart/textract/commit/fd9dee0ca2a21fb8a0695170b1967e8df56bfd7f) - use 'esc' instead of right-click to clear current points *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`91c7428`](https://github.com/simonsanchezart/textract/commit/91c742880fb0de4b8658c83c903f59a8ed6898da) - add mark draggeable edges *(PR [#33](https://github.com/simonsanchezart/textract/pull/33) by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`19f2274`](https://github.com/simonsanchezart/textract/commit/19f22741570908b0a82339c17a511622f9e346f6) - implement quick zoom to mouse position *(PR [#34](https://github.com/simonsanchezart/textract/pull/34) by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`bedbd5f`](https://github.com/simonsanchezart/textract/commit/bedbd5faaf99d48f082e0981f52f8d8e223e60ee) - improve dot grid behavior *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`0e07f2e`](https://github.com/simonsanchezart/textract/commit/0e07f2e9473759db23aed151c7f14cf0daa697d0) - improve image sizing on import and conversion (consistent sizes) *(PR [#35](https://github.com/simonsanchezart/textract/pull/35) by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`076d8a5`](https://github.com/simonsanchezart/textract/commit/076d8a537eadd6ca8757d96d3a800c8650a5214f) - make target canvas even bigger on double click *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`db10286`](https://github.com/simonsanchezart/textract/commit/db10286538b0f0a6a0d136b350e22e43f75b6982) - make axis lines size zoom-independent *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`bbf03df`](https://github.com/simonsanchezart/textract/commit/bbf03dfabaada5a04f0f9471da1feb178c9fc295) - add settings menu *(PR [#36](https://github.com/simonsanchezart/textract/pull/36) by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`4cf9dc4`](https://github.com/simonsanchezart/textract/commit/4cf9dc4b5fc155269eba1dd962ba2983c5c36938) - image packing *(PR [#37](https://github.com/simonsanchezart/textract/pull/37) by [@simonsanchezart](https://github.com/simonsanchezart))*

### :bug: Bug Fixes
- [`7f41e9e`](https://github.com/simonsanchezart/textract/commit/7f41e9eca3c0616cdf3660112ef130d6385b64bf) - hover conversion when hovering mark line/point *(PR [#23](https://github.com/simonsanchezart/textract/pull/23) by [@ghsnyc](https://github.com/ghsnyc))*
- [`5c4e16f`](https://github.com/simonsanchezart/textract/commit/5c4e16f4d4ff7bf276f583e14ce5a7d2b611bb26) - apply EXIF orientation when decoding images *(PR [#29](https://github.com/simonsanchezart/textract/pull/29) by [@AbdullahPesteli](https://github.com/AbdullahPesteli))*
- [`ae4e6b8`](https://github.com/simonsanchezart/textract/commit/ae4e6b8e57b3013233e5ce8d6774290d90e034ac) - set mark as dirty when deleting atlas image *(PR [#30](https://github.com/simonsanchezart/textract/pull/30) by [@simonsanchezart](https://github.com/simonsanchezart))*
  - :arrow_lower_right: *fixes issue [#28](https://github.com/simonsanchezart/textract/issues/28) opened by [@ghsnyc](https://github.com/ghsnyc)*
- [`3ebe99f`](https://github.com/simonsanchezart/textract/commit/3ebe99f7a0857585eec9cc62c68fcdcf3c0723e5) - non-required parameter *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*

### :recycle: Refactors
- [`b364d6e`](https://github.com/simonsanchezart/textract/commit/b364d6ed63d4105a61f638ea00080c5da1ffce86) - remove unecessary argument *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`9aa6689`](https://github.com/simonsanchezart/textract/commit/9aa6689aceea93e43330969d0015a7c3438d9f64) - remove comments *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`f8315ed`](https://github.com/simonsanchezart/textract/commit/f8315edb1cecf74b453ac7b6b400166890b7991e) - remove unused variable *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*

### :wrench: Chores
- [`58e0b98`](https://github.com/simonsanchezart/textract/commit/58e0b9822a4229176493108cd5bd4adf3034f6ac) - ignore ts deprecations *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*


## [v1.1.0] - 2026-08-15
### :sparkles: New Features
- [`d10aa0a`](https://github.com/simonsanchezart/textract/commit/d10aa0a7c4fd8cf06e85b9873471f96b9db1f9ea) - implement drag-n-drop images *(PR [#17](https://github.com/simonsanchezart/textract/pull/17) by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`2cdb420`](https://github.com/simonsanchezart/textract/commit/2cdb420656be95c5ef223b3b809aff8d3a3f096c) - add changelog link on update toast *(PR [#25](https://github.com/simonsanchezart/textract/pull/25) by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`14ce4c9`](https://github.com/simonsanchezart/textract/commit/14ce4c9f08c0c07892f9d4cf49cc8c7560864eeb) - add link to contributors *(PR [#26](https://github.com/simonsanchezart/textract/pull/26) by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`966b0dc`](https://github.com/simonsanchezart/textract/commit/966b0dc54101c84285657b3f35aaefd5a35cfc91) - zoom-stable handles, selection highlight, multi-select *(PR [#20](https://github.com/simonsanchezart/textract/pull/20) by [@ghsnyc](https://github.com/ghsnyc))*
- [`1671468`](https://github.com/simonsanchezart/textract/commit/1671468e19ca04b75da3cd7e3b12842eda371acd) - add bundled help doc (workflow guide + full shortcut reference) *(PR [#21](https://github.com/simonsanchezart/textract/pull/21) by [@ghsnyc](https://github.com/ghsnyc))*

### :bug: Bug Fixes
- [`daacf0b`](https://github.com/simonsanchezart/textract/commit/daacf0b36c89d03371aab5b43427476eb37232ad) - **macos**: support command shortcuts and app bundle *(PR [#14](https://github.com/simonsanchezart/textract/pull/14) by [@jrappeneker](https://github.com/jrappeneker))*

### :wrench: Chores
- [`4b4aa73`](https://github.com/simonsanchezart/textract/commit/4b4aa736b8b8ae92a18700f07ca913fcfc3ef77d) - use recommended tauri cargo config *(PR [#13](https://github.com/simonsanchezart/textract/pull/13) by [@simonsanchezart](https://github.com/simonsanchezart))*
  - :arrow_lower_right: *addresses issue [#12](https://github.com/simonsanchezart/textract/issues/12) opened by [@zamazan4ik](https://github.com/zamazan4ik)*


## [v1.0.0] - 2026-07-05
### :sparkles: New Features
- [`8e1516a`](https://github.com/simonsanchezart/textract/commit/8e1516a406301eecefc98f82a71955ab4ef2955f) - center view on start *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`7c18f16`](https://github.com/simonsanchezart/textract/commit/7c18f160dba33aa9f9a7ee16922faf3f40968fb8) - shortcut tooltips *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`fafcd65`](https://github.com/simonsanchezart/textract/commit/fafcd65ef0621a6bb0d53f48fccf442d50ae4de5) - change default atlas size *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`8b130c5`](https://github.com/simonsanchezart/textract/commit/8b130c5970cf650f11d78d0204dd3d7b3de36da2) - fix window layout multi-platform *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`0215547`](https://github.com/simonsanchezart/textract/commit/02155474fbee9f1190aabe5095f8bbda964f127c) - improve atlas icons, add context menu shortcuts *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`6113086`](https://github.com/simonsanchezart/textract/commit/6113086fd2c0bda60635d430b77484e42fb301b8) - add icons *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`6cc4c34`](https://github.com/simonsanchezart/textract/commit/6cc4c3418df5b749a9b6ce1fbdbbf259c37a8bc8) - rename UI functions *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`37eb77c`](https://github.com/simonsanchezart/textract/commit/37eb77c5fe67fdf566b283ade6cda2996bf2b876) - add credits *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*

### :bug: Bug Fixes
- [`959267b`](https://github.com/simonsanchezart/textract/commit/959267baa3e1a1e2b8f4400db755d612e82e2da6) - convert button not working *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`e17555e`](https://github.com/simonsanchezart/textract/commit/e17555e75c9cae7dd7b1e18d427e062299d9f84e) - transparent border on selected image export *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*

### :wrench: Chores
- [`b92d275`](https://github.com/simonsanchezart/textract/commit/b92d275031da7b2eb967146920b4283d5a692d48) - set v1.0.0 *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`c42cd80`](https://github.com/simonsanchezart/textract/commit/c42cd80dc7b39ca23c1d9cc2bc115322fd809ca7) - remove unused asset *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*
- [`9537d2e`](https://github.com/simonsanchezart/textract/commit/9537d2ed5649a99be44431ddb2d59481a293115b) - ignore trailer assets *(commit by [@simonsanchezart](https://github.com/simonsanchezart))*

[v1.0.0]: https://github.com/simonsanchezart/textract/compare/v0.0.0...v1.0.0
[v1.1.0]: https://github.com/simonsanchezart/textract/compare/v1.0.0...v1.1.0
[v1.2.0]: https://github.com/simonsanchezart/textract/compare/v1.1.0...v1.2.0
