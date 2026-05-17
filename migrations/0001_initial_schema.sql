-- filament_families: core inventory catalog
CREATE TABLE filament_families (
  id                      TEXT PRIMARY KEY,
  brand                   TEXT NOT NULL,
  material                TEXT NOT NULL,
  brand_color_name        TEXT NOT NULL,
  normalized_visual_color TEXT NOT NULL,
  reorder_threshold       INTEGER NOT NULL DEFAULT 3,
  photo_url               TEXT,
  notes                   TEXT,
  active                  INTEGER NOT NULL DEFAULT 1,
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL,

  UNIQUE (brand, material, brand_color_name)
);

CREATE INDEX idx_families_active ON filament_families(active);
CREATE INDEX idx_families_material ON filament_families(material);
CREATE INDEX idx_families_visual_color ON filament_families(normalized_visual_color);

-- barcode_mappings: one barcode -> one family; one family -> many barcodes
CREATE TABLE barcode_mappings (
  barcode            TEXT PRIMARY KEY,
  filament_family_id TEXT NOT NULL REFERENCES filament_families(id),
  created_at         TEXT NOT NULL
);

CREATE INDEX idx_barcodes_family ON barcode_mappings(filament_family_id);

-- inventory_movements: append-only ledger; created_at/created_by never mutated
CREATE TABLE inventory_movements (
  id                 TEXT PRIMARY KEY,
  filament_family_id TEXT NOT NULL REFERENCES filament_families(id),
  movement_type      TEXT NOT NULL,
  quantity_delta     INTEGER NOT NULL,
  notes              TEXT,
  created_by         TEXT NOT NULL,
  created_at         TEXT NOT NULL,
  updated_by         TEXT,
  updated_at         TEXT
);

CREATE INDEX idx_movements_family ON inventory_movements(filament_family_id);
CREATE INDEX idx_movements_created_at ON inventory_movements(created_at);
CREATE INDEX idx_movements_type ON inventory_movements(movement_type);

-- inventory_projection: materialized current stock; updated transactionally with each movement
CREATE TABLE inventory_projection (
  filament_family_id TEXT PRIMARY KEY REFERENCES filament_families(id),
  current_quantity   INTEGER NOT NULL DEFAULT 0,
  updated_at         TEXT NOT NULL
);
