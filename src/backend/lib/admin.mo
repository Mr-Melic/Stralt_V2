import Map "mo:core/Map";
import Types "../types/admin";

module {

    // ── Enemy configs ───────────────────────────────────────────────────────────

    public func setEnemyConfig(
        store  : Map.Map<Text, Types.EnemyConfig>,
        config : Types.EnemyConfig,
    ) : Types.CmdResult {
        store.add(config.id, config);
        #ok;
    };

    public func deleteEnemyConfig(
        store : Map.Map<Text, Types.EnemyConfig>,
        id    : Text,
    ) : Types.CmdResult {
        store.remove(id);
        #ok;
    };

    public func getEnemyConfigs(
        store : Map.Map<Text, Types.EnemyConfig>,
    ) : [Types.EnemyConfig] {
        store.values().toArray();
    };

    // ── Region configs ───────────────────────────────────────────────────────────

    public func setRegionConfig(
        store  : Map.Map<Text, Types.RegionConfig>,
        config : Types.RegionConfig,
    ) : Types.CmdResult {
        store.add(config.id, config);
        #ok;
    };

    public func deleteRegionConfig(
        store : Map.Map<Text, Types.RegionConfig>,
        id    : Text,
    ) : Types.CmdResult {
        store.remove(id);
        #ok;
    };

    public func getRegionConfigs(
        store : Map.Map<Text, Types.RegionConfig>,
    ) : [Types.RegionConfig] {
        store.values().toArray();
    };

    // ── Player sprite configs ────────────────────────────────────────────────────

    public func setPlayerSpriteConfig(
        store  : Map.Map<Text, Types.PlayerSpriteConfig>,
        config : Types.PlayerSpriteConfig,
    ) : Types.CmdResult {
        store.add(config.id, config);
        #ok;
    };

    public func getPlayerSpriteConfigs(
        store : Map.Map<Text, Types.PlayerSpriteConfig>,
    ) : [Types.PlayerSpriteConfig] {
        store.values().toArray();
    };

    // ── Spell configs
    // ── Spell configs ────────────────────────────────────────────────────────

    public func setSpellConfig(
        store  : Map.Map<Text, Types.SpellConfig>,
        config : Types.SpellConfig,
    ) : Types.CmdResult {
        store.add(config.id, config);
        #ok;
    };

    public func deleteSpellConfig(
        store : Map.Map<Text, Types.SpellConfig>,
        id    : Text,
    ) : Types.CmdResult {
        store.remove(id);
        #ok;
    };

    public func getSpellConfigs(
        store : Map.Map<Text, Types.SpellConfig>,
    ) : [Types.SpellConfig] {
        store.values().toArray();
    };

    // ── Map modifier configs ─────────────────────────────────────────────

    public func setMapModifier(
        store  : Map.Map<Text, Types.MapModifierConfig>,
        config : Types.MapModifierConfig,
    ) : Types.CmdResult {
        store.add(config.id, config);
        #ok;
    };

    public func deleteMapModifier(
        store : Map.Map<Text, Types.MapModifierConfig>,
        id    : Text,
    ) : Types.CmdResult {
        store.remove(id);
        #ok;
    };

    public func getMapModifiers(
        store : Map.Map<Text, Types.MapModifierConfig>,
    ) : [Types.MapModifierConfig] {
        store.values().toArray();
    };

    /// Update only the triggerChance for an existing map modifier.
    /// Returns #err if the modifier id is not found.
    public func setMapModifierChance(
        store  : Map.Map<Text, Types.MapModifierConfig>,
        id     : Text,
        chance : Nat,
    ) : Types.CmdResult {
        switch (store.get(id)) {
            case null { #err("Map modifier '" # id # "' not found") };
            case (?existing) {
                store.add(id, { existing with triggerChance = chance });
                #ok;
            };
        };
    };

    /// Returns the 2 default map modifiers seeded on first run.
    public func defaultMapModifiers() : [Types.MapModifierConfig] {
        [
            {
                id            = "slime_flood";
                name          = "Slime Flood";
                description   = "Movement for both enemies and player costs double MP per tile cell.";
                modifierType  = "slime_flood";
                active        = true;
                triggerChance = 20;
            },
            {
                id            = "paper_windstorm";
                name          = "Paper Windstorm";
                description   = "Ranged spells further than 1 tile away have a 50% chance to miss.";
                modifierType  = "paper_windstorm";
                active        = true;
                triggerChance = 20;
            },
        ];
    };

    /// Returns the 17 default spells that pre-populate the store on first run.
    /// Returns the default spells that pre-populate the store on first run.
    /// Includes the Physical Attack special entry (isPhysical = true, only RES applies).
    /// Returns the default spells that pre-populate the store on first run.
    /// Includes the Physical Attack special entry (isPhysical = true, only RES applies).
    /// All spells include the new targeting property fields (minRange, maxRange, etc.).
    /// Returns the default spells that pre-populate the store on first run.
    /// Old spells (Blood Nova, Crimson Heal, Cursed Gust, Drain Life, Entangle,
    /// Fireball, Frost Nova, Heal, Ice Shard, Inferno, Meteor Strike, Mist Form,
    /// Obliterate, Physical Attack, Plague Wave, Poison Dart) have been removed.
    /// Only new-schema spells remain here.
    public func defaultSpells() : [Types.SpellConfig] {
        [
            // ── Close-range / diagonal damage ─────────────────────────────────
            // Shadow Strike — diagonal extended reach (shadow/dark pattern)
            { id = "shadow_strike"; name = "Shadow Strike"; description = "A strike from the shadows."; iconEmoji = "\u{1F311}"; apCost = 3; mpCost = 0; damage = 35; healAmount = 0; effectType = "damage"; spellType = "damage"; isPhysical = false; range = 3; minRange = 1; maxRange = 4; modifiableRange = true; lineOfSight = false; linear = false; diagonal = true; freeCells = false; aoe = false; multiTarget = false; hitsAllies = false; hitTiles = [(1,1),(2,2),(3,3),(-1,1),(-2,2),(-3,3),(1,-1),(2,-2),(3,-3),(-1,-1),(-2,-2),(-3,-3)]; effectCategory = "damage"; usableByPlayer = true; usableByEnemy = true; minLevel = 1; effectParams = (null : ?Text); isSummon = false; summonAI = ""; summonLifespan = 0; summonUnitDef = { pieceType = ""; level = 0; hpScale = 0.0; damageScale = 0.0 }; cooldown = 2 },

            // Soul Rend — diagonal DoT burst
            { id = "soul_rend"; name = "Soul Rend"; description = "Tears at the soul, dealing damage over 2 turns."; iconEmoji = "\u{1F480}"; apCost = 3; mpCost = 0; damage = 25; healAmount = 0; effectType = "dot"; spellType = "damage"; isPhysical = false; range = 2; minRange = 1; maxRange = 3; modifiableRange = true; lineOfSight = true; linear = false; diagonal = false; freeCells = false; aoe = false; multiTarget = false; hitsAllies = false; hitTiles = [(2,2),(-2,2),(2,-2),(-2,-2),(1,2),(2,1),(-1,2),(-2,1)]; effectCategory = "dot"; usableByPlayer = true; usableByEnemy = true; minLevel = 1; effectParams = (null : ?Text); isSummon = false; summonAI = ""; summonLifespan = 0; summonUnitDef = { pieceType = ""; level = 0; hpScale = 0.0; damageScale = 0.0 }; cooldown = 4 },

            // ── Drain spells ──────────────────────────────────────────────────
            // Vampire Bite — close diagonal drain (1 tile diagonal)
            { id = "vampire_bite"; name = "Vampire Bite"; description = "Drain 20 life from an enemy, heal self 20 HP."; iconEmoji = "\u{1F9B7}"; apCost = 3; mpCost = 0; damage = 20; healAmount = 20; effectType = "heal"; spellType = "drain"; isPhysical = false; range = 1; minRange = 1; maxRange = 1; modifiableRange = false; lineOfSight = true; linear = false; diagonal = false; freeCells = false; aoe = false; multiTarget = false; hitsAllies = false; hitTiles = [(1,1),(-1,1),(1,-1),(-1,-1)]; effectCategory = "drain"; usableByPlayer = true; usableByEnemy = true; minLevel = 1; effectParams = (null : ?Text); isSummon = false; summonAI = ""; summonLifespan = 0; summonUnitDef = { pieceType = ""; level = 0; hpScale = 0.0; damageScale = 0.0 }; cooldown = 2 },

            // ── Defensive / self-buff ─────────────────────────────────────────
            { id = "reflect_barrier"; name = "Reflect Barrier"; description = "Reflects the next spell back at the caster."; iconEmoji = "\u{1F6E1}"; apCost = 3; mpCost = 0; damage = 0; healAmount = 0; effectType = "buff"; spellType = "damage"; isPhysical = false; range = 1; minRange = 0; maxRange = 0; modifiableRange = false; lineOfSight = false; linear = false; diagonal = false; freeCells = false; aoe = false; multiTarget = false; hitsAllies = false; hitTiles = []; effectCategory = "defense"; usableByPlayer = true; usableByEnemy = true; minLevel = 1; effectParams = (null : ?Text); isSummon = false; summonAI = ""; summonLifespan = 0; summonUnitDef = { pieceType = ""; level = 0; hpScale = 0.0; damageScale = 0.0 }; cooldown = 3 },

            // ── AoE ────────────────────────────────────────────────────────────
            // Thunder Clap — lightning star 8-direction
            { id = "thunder_clap"; name = "Thunder Clap"; description = "A blast that hits all nearby."; iconEmoji = "\u{26A1}"; apCost = 4; mpCost = 0; damage = 25; healAmount = 0; effectType = "aoe"; spellType = "damage"; isPhysical = false; range = 2; minRange = 1; maxRange = 2; modifiableRange = false; lineOfSight = false; linear = false; diagonal = false; freeCells = false; aoe = true; multiTarget = true; hitsAllies = false; hitTiles = [(0,1),(0,-1),(1,0),(-1,0),(1,1),(1,-1),(-1,1),(-1,-1)]; effectCategory = "aoe"; usableByPlayer = true; usableByEnemy = true; minLevel = 1; effectParams = (null : ?Text); isSummon = false; summonAI = ""; summonLifespan = 0; summonUnitDef = { pieceType = ""; level = 0; hpScale = 0.0; damageScale = 0.0 }; cooldown = 3 },

            // ── Ultimate ──────────────────────────────────────────────────────
            // Void Collapse — pulls all targets 2 tiles toward caster then AoE damage
            { id = "void_collapse"; name = "Void Collapse"; description = "Creates a gravitational collapse that pulls all nearby enemies toward you, then deals massive AoE damage."; iconEmoji = "\u{1F300}"; apCost = 12; mpCost = 0; damage = 80; healAmount = 0; effectType = "attract_multi"; spellType = "damage"; isPhysical = false; range = 2; minRange = 1; maxRange = 3; modifiableRange = false; lineOfSight = false; linear = false; diagonal = false; freeCells = false; aoe = true; multiTarget = true; hitsAllies = false; hitTiles = [(0,1),(0,2),(0,3),(1,0),(2,0),(3,0),(0,-1),(0,-2),(0,-3),(-1,0),(-2,0),(-3,0),(1,1),(2,2),(1,-1),(2,-2),(-1,1),(-2,2),(-1,-1),(-2,-2)]; effectCategory = "aoe"; usableByPlayer = true; usableByEnemy = true; minLevel = 30; effectParams = ?"{\"attractDistance\":2,\"attractAll\":true}"; isSummon = false; summonAI = ""; summonLifespan = 0; summonUnitDef = { pieceType = ""; level = 0; hpScale = 0.0; damageScale = 0.0 }; cooldown = 5 },
        ];
    };

    // ── AdminGameConfig helpers ──────────────────────────────────────────────

    public func defaultGameConfig() : Types.AdminGameConfig {
        {
            leaderBoostPercent = 10;
            dokaSpawnChance    = 40;
            dokaSpawnBaseValue = 5;
        };
    };
    // ── Shop package configs ─────────────────────────────────────────────────

    public func setShopPackage(
        store  : Map.Map<Text, Types.ShopPackage>,
        pkg    : Types.ShopPackage,
    ) : Types.CmdResult {
        store.add(pkg.id, pkg);
        #ok;
    };

    public func deleteShopPackage(
        store : Map.Map<Text, Types.ShopPackage>,
        id    : Text,
    ) : Types.CmdResult {
        store.remove(id);
        #ok;
    };

    public func getShopPackages(
        store : Map.Map<Text, Types.ShopPackage>,
    ) : [Types.ShopPackage] {
        store.values().toArray();
    };

    // ── Purchase records ─────────────────────────────────────────────────────

    public func addPurchaseRecord(
        store  : Map.Map<Text, Types.PurchaseRecord>,
        record : Types.PurchaseRecord,
    ) : Types.CmdResult {
        store.add(record.id, record);
        #ok;
    };

    public func getPurchaseRecords(
        store           : Map.Map<Text, Types.PurchaseRecord>,
        filterPrincipal : ?Principal,
    ) : [Types.PurchaseRecord] {
        switch (filterPrincipal) {
            case null { store.values().toArray() };
            case (?p) {
                store.values().filter(func(r : Types.PurchaseRecord) : Bool {
                    r.userPrincipal == p
                }).toArray()
            };
        };
    };

    public func completePurchaseRecord(
        store : Map.Map<Text, Types.PurchaseRecord>,
        id    : Text,
    ) : Types.CmdResult {
        switch (store.get(id)) {
            case null { #err("Purchase record '" # id # "' not found") };
            case (?rec) {
                store.add(id, { rec with status = "completed" });
                #ok;
            };
        };
    };

    /// Returns the default shop packages seeded on first run.
    public func defaultShopPackages() : [Types.ShopPackage] {
        [
            { id = "pkg_10";      dokaAmount = 10;        priceEuroCents = 100;    paymentLink = ""; displayOrder = 1  },
            { id = "pkg_100";     dokaAmount = 100;       priceEuroCents = 300;    paymentLink = ""; displayOrder = 2  },
            { id = "pkg_250";     dokaAmount = 250;       priceEuroCents = 500;    paymentLink = ""; displayOrder = 3  },
            { id = "pkg_500";     dokaAmount = 500;       priceEuroCents = 800;    paymentLink = ""; displayOrder = 4  },
            { id = "pkg_1k";      dokaAmount = 1_000;     priceEuroCents = 1500;   paymentLink = ""; displayOrder = 5  },
            { id = "pkg_2_5k";    dokaAmount = 2_500;     priceEuroCents = 2000;   paymentLink = ""; displayOrder = 6  },
            { id = "pkg_5k";      dokaAmount = 5_000;     priceEuroCents = 4000;   paymentLink = ""; displayOrder = 7  },
            { id = "pkg_10k";     dokaAmount = 10_000;    priceEuroCents = 7500;   paymentLink = ""; displayOrder = 8  },
            { id = "pkg_25k";     dokaAmount = 25_000;    priceEuroCents = 13000;  paymentLink = ""; displayOrder = 9  },
            { id = "pkg_50k";     dokaAmount = 50_000;    priceEuroCents = 25000;  paymentLink = ""; displayOrder = 10 },
            { id = "pkg_100k";    dokaAmount = 100_000;   priceEuroCents = 40000;  paymentLink = ""; displayOrder = 11 },
            { id = "pkg_200k";    dokaAmount = 200_000;   priceEuroCents = 70000;  paymentLink = ""; displayOrder = 12 },
            { id = "pkg_400k";    dokaAmount = 400_000;   priceEuroCents = 120000; paymentLink = ""; displayOrder = 13 },
            { id = "pkg_800k";    dokaAmount = 800_000;   priceEuroCents = 200000; paymentLink = ""; displayOrder = 14 },
            { id = "pkg_1_6m";    dokaAmount = 1_600_000; priceEuroCents = 350000; paymentLink = ""; displayOrder = 15 },
        ];
    };
    // ── Achievement configs ──────────────────────────────────────────────────

    public func setAchievementConfig(
        store  : Map.Map<Text, Types.AchievementConfig>,
        config : Types.AchievementConfig,
    ) : Types.CmdResult {
        store.add(config.id, config);
        #ok;
    };

    public func deleteAchievementConfig(
        store : Map.Map<Text, Types.AchievementConfig>,
        id    : Text,
    ) : Types.CmdResult {
        store.remove(id);
        #ok;
    };

    public func getAchievementConfigs(
        store : Map.Map<Text, Types.AchievementConfig>,
    ) : [Types.AchievementConfig] {
        store.values().toArray();
    };

    /// Returns the 15 default achievements seeded on first run.
    public func defaultAchievements() : [Types.AchievementConfig] {
        [
            { id = "first_blood";        name = "First Blood";        description = "Win your first battle.";                            dokaReward = 50;   condition = "first_battle_win";     active = true },
            { id = "survivor";           name = "Survivor";           description = "Survive a battle with 1 HP remaining.";             dokaReward = 100;  condition = "survive_1hp";           active = true },
            { id = "spell_scholar";      name = "Spell Scholar";      description = "Upgrade any spell to level 5.";                    dokaReward = 75;   condition = "spell_level_5";         active = true },
            { id = "doka_hoarder";       name = "Doka Hoarder";       description = "Accumulate 1,000 Doka.";                          dokaReward = 200;  condition = "doka_1000";             active = true },
            { id = "explorer";           name = "Explorer";           description = "Visit 25 different maps.";                         dokaReward = 150;  condition = "explore_25_maps";       active = true },
            { id = "betrayal_witness";   name = "Betrayal Witness";   description = "See an enemy betray an ally in battle.";           dokaReward = 100;  condition = "betrayal_witness";      active = true },
            { id = "leader_slayer";      name = "Leader Slayer";      description = "Kill a leader enemy.";                             dokaReward = 150;  condition = "leader_slayer";          active = true },
            { id = "jackpot";            name = "Jackpot";            description = "Trigger the jackpot heal event.";                  dokaReward = 200;  condition = "jackpot_heal";           active = true },
            { id = "loot_hunter";        name = "Loot Hunter";        description = "Pick up Doka from the ground 10 times.";           dokaReward = 75;   condition = "loot_10_doka";           active = true },
            { id = "double_betrayal";    name = "Double Betrayal";    description = "Trigger a double betrayal event.";                 dokaReward = 250;  condition = "double_betrayal";        active = true },
            { id = "unstoppable";        name = "Unstoppable";        description = "Reach player level 10.";                          dokaReward = 300;  condition = "level_10";               active = true },
            { id = "spell_master";       name = "Spell Master";       description = "Have 8 spells equipped at once.";                  dokaReward = 100;  condition = "spell_master_8";         active = true },
            { id = "critical_striker";   name = "Critical Striker";   description = "Land 5 critical hits in a single battle.";         dokaReward = 150;  condition = "critical_5_in_battle";   active = true },
            { id = "pacifist_run";       name = "Pacifist Run";       description = "Win a battle using only heal or buff spells.";     dokaReward = 500;  condition = "pacifist_run";           active = true },
            { id = "rich_vampire";       name = "Rich Vampire";       description = "Accumulate 10,000 Doka.";                         dokaReward = 1000; condition = "doka_10000";            active = true },
        ];
    };
    // ── Boss configs ───────────────────────────────────────────────────────────

    /// Convenience helper used in main.mo to keep the boss seed block compact.
    func _phase(
        num  : Nat,
        thr  : Float,
        mult : Float,
        sp   : [Text],
        abs  : [Text],
        sc   : Nat,
    ) : Types.BossPhaseConfig {
        {
            phaseNumber      = num;
            hpThreshold      = thr;
            statMultiplier   = mult;
            spellPoolIds     = sp;
            specialAbilities = abs;
            summonCount      = sc;
        };
    };

    /// Returns the 12 default bosses seeded on first run.
    public func defaultBossConfigs() : [Types.BossConfig] {
        [
            {
                id = "pale_archbishop";
                name = "The Pale Archbishop";
                pieceType = "bishop";
                baseStats = { hp = 500; ap = 8; mp = 4; atk = 45; res = 60; init = 6; sp = 80 };
                phase1 = _phase(1, 1.0, 1.0,
                    ["fireball", "cursed_gust", "entangle"],
                    [], 0);
                phase2 = _phase(2, 0.5, 1.5,
                    ["fireball", "cursed_gust", "reflect_barrier", "mist_form"],
                    ["reflect_shield", "spawn_minions"], 2);
                bossMapColor = "pale_violet";
                portalColor  = "crimson";
                rewardDokaMultiplier = 10.0;
                rewardXpMultiplier   = 8.0;
                defeated   = false;
                adminNotes = "First boss. Phase 2 at 50% HP: reflect shield active, spawns 2 skeleton minions.";
            },
            {
                id = "crimson_countess";
                name = "Crimson Countess";
                pieceType = "rook";
                baseStats = { hp = 600; ap = 7; mp = 5; atk = 80; res = 40; init = 8; sp = 30 };
                phase1 = _phase(1, 1.0, 1.0,
                    ["physical_attack", "shadow_strike", "soul_rend"],
                    [], 0);
                phase2 = _phase(2, 0.4, 1.6,
                    ["physical_attack", "shadow_strike", "blood_nova"],
                    ["lava_trail"], 0);
                bossMapColor = "deep_red";
                portalColor  = "crimson";
                rewardDokaMultiplier = 12.0;
                rewardXpMultiplier   = 9.0;
                defeated   = false;
                adminNotes = "Phase 2 at 40% HP: leaves lava hazard tiles on every movement square.";
            },
            {
                id = "void_grandmaster";
                name = "The Void Grandmaster";
                pieceType = "king";
                baseStats = { hp = 450; ap = 9; mp = 6; atk = 55; res = 55; init = 10; sp = 55 };
                phase1 = _phase(1, 1.0, 1.0,
                    ["shadow_strike", "void_collapse", "mist_form"],
                    [], 0);
                phase2 = _phase(2, 0.6, 1.4,
                    ["shadow_strike", "void_collapse", "obliterate"],
                    ["teleport_adjacent", "illusion_split"], 3);
                bossMapColor = "void_purple";
                portalColor  = "crimson";
                rewardDokaMultiplier = 15.0;
                rewardXpMultiplier   = 12.0;
                defeated   = false;
                adminNotes = "Phase 2 at 60% HP: teleports adjacent every turn, splits into 3 illusion copies.";
            },
            {
                id = "bone_cavalier";
                name = "Bone Cavalier";
                pieceType = "knight";
                baseStats = { hp = 400; ap = 8; mp = 8; atk = 60; res = 35; init = 14; sp = 25 };
                phase1 = _phase(1, 1.0, 1.0,
                    ["physical_attack", "shadow_strike", "ice_shard"],
                    [], 0);
                phase2 = _phase(2, 0.5, 1.5,
                    ["physical_attack", "thunder_clap", "frost_nova"],
                    ["knight_jump_ignore_walls", "spike_on_land"], 0);
                bossMapColor = "bone_white";
                portalColor  = "crimson";
                rewardDokaMultiplier = 11.0;
                rewardXpMultiplier   = 9.0;
                defeated   = false;
                adminNotes = "Phase 2 at 50% HP: double jump range, places spike hazard tiles at landing positions.";
            },
            {
                id = "weeping_pawn";
                name = "Weeping Pawn";
                pieceType = "pawn";
                baseStats = { hp = 350; ap = 6; mp = 3; atk = 30; res = 20; init = 5; sp = 15 };
                phase1 = _phase(1, 1.0, 1.0,
                    ["physical_attack", "poison_dart", "cursed_gust"],
                    ["curse_on_hit"], 0);
                phase2 = _phase(2, 0.3, 2.0,
                    ["blood_nova", "plague_wave", "inferno", "obliterate"],
                    ["curse_on_hit", "promote_queen"], 0);
                bossMapColor = "grief_grey";
                portalColor  = "crimson";
                rewardDokaMultiplier = 18.0;
                rewardXpMultiplier   = 15.0;
                defeated   = false;
                adminNotes = "25% curse chance on each hit. Phase 2 at 30% HP: transforms into Weeping Queen with full reset HP and 2x stats.";
            },
            {
                id = "starborn_queen";
                name = "Starborn Queen";
                pieceType = "queen";
                baseStats = { hp = 700; ap = 10; mp = 8; atk = 75; res = 65; init = 11; sp = 70 };
                phase1 = _phase(1, 1.0, 1.0,
                    ["fireball", "blood_nova", "void_collapse", "meteor_strike"],
                    ["attack_all_lines"], 0);
                phase2 = _phase(2, 0.5, 1.6,
                    ["obliterate", "plague_wave", "void_collapse", "blood_nova"],
                    ["attack_all_lines", "void_tiles"], 4);
                bossMapColor = "cosmic_gold";
                portalColor  = "crimson";
                rewardDokaMultiplier = 20.0;
                rewardXpMultiplier   = 18.0;
                defeated   = false;
                adminNotes = "Attacks every unit in queen-range lines simultaneously. Phase 2 at 50% HP: creates 4 void tiles that double in damage every turn.";
            },
            {
                id = "fetid_rook";
                name = "The Fetid Rook";
                pieceType = "rook";
                baseStats = { hp = 800; ap = 6; mp = 4; atk = 50; res = 70; init = 4; sp = 20 };
                phase1 = _phase(1, 1.0, 1.0,
                    ["physical_attack", "poison_dart", "soul_rend"],
                    ["compounding_rot"], 0);
                phase2 = _phase(2, 0.4, 1.3,
                    ["physical_attack", "poison_dart", "plague_wave"],
                    ["compounding_rot", "split_rooks"], 1);
                bossMapColor = "rot_green";
                portalColor  = "crimson";
                rewardDokaMultiplier = 14.0;
                rewardXpMultiplier   = 11.0;
                defeated   = false;
                adminNotes = "DoT compounds: 1 dmg first tick, doubles each tick. Phase 2 at 40% HP: splits into two half-HP rooks; both must be defeated simultaneously.";
            },
            {
                id = "eternal_pawn_king";
                name = "Eternal Pawn King";
                pieceType = "pawn";
                baseStats = { hp = 550; ap = 7; mp = 5; atk = 65; res = 50; init = 7; sp = 40 };
                phase1 = _phase(1, 1.0, 1.0,
                    ["physical_attack", "shadow_strike", "entangle"],
                    ["advance_per_turn"], 0);
                phase2 = _phase(2, 0.5, 1.5,
                    ["physical_attack", "cursed_gust", "obliterate"],
                    ["advance_per_turn", "ap_drain"], 0);
                bossMapColor = "ancient_bronze";
                portalColor  = "crimson";
                rewardDokaMultiplier = 13.0;
                rewardXpMultiplier   = 10.0;
                defeated   = false;
                adminNotes = "Advances 1 tile each turn toward player. Phase 2 at 50% HP: becomes stationary but drains 1 AP from player each turn.";
            },
            {
                id = "midnight_bishop";
                name = "The Midnight Bishop";
                pieceType = "bishop";
                baseStats = { hp = 480; ap = 9; mp = 7; atk = 55; res = 45; init = 9; sp = 75 };
                phase1 = _phase(1, 1.0, 1.0,
                    ["shadow_strike", "cursed_gust", "soul_rend", "drain_life"],
                    ["twin_flank"], 0);
                phase2 = _phase(2, 0.25, 1.8,
                    ["shadow_strike", "blood_nova", "obliterate", "reflect_barrier"],
                    ["twin_flank", "merge_bishops", "magic_reflect"], 0);
                bossMapColor = "midnight_blue";
                portalColor  = "crimson";
                rewardDokaMultiplier = 16.0;
                rewardXpMultiplier   = 13.0;
                defeated   = false;
                adminNotes = "Twin bishops share one HP pool, alternate flanking turns. Phase 2 at 25% HP: merge into one super-bishop with magic reflect passive.";
            },
            {
                id = "broodmother_rook";
                name = "Broodmother Rook";
                pieceType = "rook";
                baseStats = { hp = 650; ap = 7; mp = 5; atk = 55; res = 55; init = 6; sp = 30 };
                phase1 = _phase(1, 1.0, 1.0,
                    ["physical_attack", "poison_dart", "cursed_gust"],
                    ["larvae_spawn"], 0);
                phase2 = _phase(2, 0.5, 1.4,
                    ["physical_attack", "plague_wave", "poison_dart"],
                    ["larvae_spawn", "shell_armor", "larvae_explode"], 0);
                bossMapColor = "swamp_brown";
                portalColor  = "crimson";
                rewardDokaMultiplier = 14.0;
                rewardXpMultiplier   = 11.0;
                defeated   = false;
                adminNotes = "Spawns 1-HP larvae on each hit. Phase 2 at 50% HP: larvae explode for heavy poison on contact; gains shell_armor until all larvae are dead.";
            },
            {
                id = "lord_of_static";
                name = "Lord of Static";
                pieceType = "king";
                baseStats = { hp = 520; ap = 9; mp = 6; atk = 70; res = 50; init = 11; sp = 50 };
                phase1 = _phase(1, 1.0, 1.0,
                    ["thunder_clap", "frost_nova", "physical_attack"],
                    ["shock_tiles"], 0);
                phase2 = _phase(2, 0.4, 1.6,
                    ["thunder_clap", "frost_nova", "blood_nova", "obliterate"],
                    ["shock_tiles", "chain_lightning"], 0);
                bossMapColor = "electric_blue";
                portalColor  = "crimson";
                rewardDokaMultiplier = 15.0;
                rewardXpMultiplier   = 12.0;
                defeated   = false;
                adminNotes = "Leaves shock tiles on every movement path. Phase 2 at 40% HP: all shock tiles ignite into chain-lightning spreading to adjacent tiles each turn.";
            },
            {
                id = "final_pawn";
                name = "The Final Pawn";
                pieceType = "pawn";
                baseStats = { hp = 100; ap = 4; mp = 3; atk = 10; res = 10; init = 3; sp = 10 };
                phase1 = _phase(1, 1.0, 1.0,
                    ["physical_attack"],
                    [], 0);
                phase2 = _phase(2, 0.001, 1.0,
                    ["physical_attack"],
                    ["invincible_phase", "ghost_summon"], 11);
                bossMapColor = "plain_white";
                portalColor  = "crimson";
                rewardDokaMultiplier = 50.0;
                rewardXpMultiplier   = 40.0;
                defeated   = false;
                adminNotes = "Appears weak (phase 1). At exactly 1 HP triggers phase 2: becomes invincible for 5 turns and summons ghosts of all 11 other bosses (1 HP each). Defeat all ghosts within 5 turns or Final Pawn fully heals. Must be last boss encountered.";
            },
        ];
    };
};
