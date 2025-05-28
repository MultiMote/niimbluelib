// https://print.niimbot.com/api/hardware/list

const url = "https://oss-print.niimbot.com/public_resources/static_resources/devices.json";

fetch(url)
  .then((resp) => resp.json())
  .then((items) => {
    items.sort((a, b) => a.name.localeCompare(b.name));

    const dir_d = {
      270: "left",
      180: "top",
      90: "left",
      0: "top",
    };

    const ppmm_d = {
      203: 8,
      300: 11.81,
    };

    const labeltypes_d = {
      "1": "With Gaps",
      "2": "Black",
      "3": "Continuous",
      "4": "Perforated",
      "5": "Transparent",
      "6": "Pvc Tag",
      "10": "Black Mark Gap",
      "11": "Heat Shrink Tube",
    }

    console.log(`---
title: NIIMBOT model characteristics
---

# NIIMBOT model characteristics

This is simplified and human-readable variant of [this data](${url}).

| Name | ID | DPI | Printhead resolution, px | Print direction | Paper types | Density range | Default density |
|------|----|-----|--------------------------|-----------------|-------------|---------------|-----------------|`);
    for (const item of items) {
      if (item.codes.length === 0) {
        continue;
      }

      const name = item.name.toUpperCase().replaceAll("-", "_");
      const dir = dir_d[item.printDirection];
      const ppmm = ppmm_d[item.paccuracyName];
      const paperTypes = item.paperType.split(',').map(e => labeltypes_d[e]).join(", ");

      const row = [
        name,
        item.codes.join(', '),
        item.paccuracyName,
        Math.ceil(item.widthSetEnd * ppmm),
        dir,
        paperTypes,
        `${item.solubilitySetStart}-${item.solubilitySetEnd}`,
        item.solubilitySetDefault
      ];

      console.log("|" + row.join("|") + "|")
    }
  });
