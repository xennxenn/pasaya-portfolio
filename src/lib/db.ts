import { SavedPhotoItem, PhotoItem, UserLog, MasterDataConfigs } from '../types';
import { db } from './firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit,
  writeBatch
} from "firebase/firestore";

// Format Helpers
export function formatFabricName(name: string): string {
  return name.trim().toUpperCase();
}

export function formatFabricColor(color: string): string {
  return color
    .trim()
    .split(/\s+/)
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

// Client-Side Image Compression Helper to ensure ultra-high performance and virtually unlimited persistent cloud storage capacity
export function compressImage(base64Str: string, maxWidth = 1200, maxHeight = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str); // Fallback to original if context not available
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      try {
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (err) {
        console.warn('Canvas toDataURL failed, using original', err);
        resolve(base64Str);
      }
    };
    img.onerror = (err) => {
      console.warn('Image load failed, using original', err);
      resolve(base64Str);
    };
    img.src = base64Str;
  });
}

// Collections Names
const PHOTOS_COLLECTION = 'photos';
const SETTINGS_COLLECTION = 'settings';
const LOGS_COLLECTION = 'user_logs';

// Default configs
export const DEFAULT_MASTER_DATA: MasterDataConfigs = {
  dbSeeded: false,
  cloudinaryCloudName: 'fyouajy1',
  cloudinaryUploadPreset: 'ml_default',
  cloudinaryEnabled: true,
  curtainStyles: [
    'ม่านจีบ (Pleated Curtain)',
    'ม่านลอน (Ripple Fold Curtain)',
    'ม่านพับ (Fold / Roman Blind)',
    'ม่านตาไก่ (Eyelet Curtain)',
    'ม่านคอกระเช้า (Tab Top Curtain)',
    'ม่านม้วน (Roller Blind)',
    'ม่านมู่ลี่ (Venetian Blind)',
  ],
  hashtags: [
    'Blackout (กันแสง 100%)',
    'Dimout (กันแสง 70-90%)',
    'Sheer (ผ้าโปร่ง)',
    'Earth Tone (โทนสีธรรมชาติ)',
    'Modern Grey (สีเทาทันสมัย)',
    'Natural Linen (ผ้าลินินธรรมชาติ)',
    'Luxury Velvet (กำมะหยี่หรูหรา)',
    'UV Protection (กันแสง UV)',
    'Sound Insulation (กันเสียงสะท้อน)',
    'Bright & Airy (สว่างโปร่งเบา)',
  ],
  houseTypes: [
    'บ้านเดี่ยว (Single House)',
    'ทาวน์โฮม (Townhome)',
    'คอนโดมิเนียม (Condominium)',
    'อาคารพาณิชย์ (Commercial Building)',
    'โฮมออฟฟิศ (Home Office)',
    'เพนต์เฮาส์ (Penthouse)',
  ],
  employees: [
    'ผู้ดูแลระบบ',
    'สมชาย มีสุข (Somchai)',
    'วิภา ศรีงาม (Wipa)',
    'มานะ ชูใจ (Mana)',
  ],
  developers: [
    'Land & Houses (LH)',
    'Sansiri (แสนสิริ)',
    'SC Asset',
    'AP Thailand',
    'Pruksa Real Estate (พฤกษา)',
    'Supalai (ศุภาลัย)',
    'Golden Land (โกลเด้นแลนด์)',
    'Origin Property',
    'Ananda Development',
    'Asset Wise',
    'Quality Houses (Q House)',
    'Others (อื่นๆ)',
  ],
  fabrics: [
    'ABSOLUTE', 'AFFINITY', 'AFRICA', 'AGATE', 'ALASKA', 'ALBANI', 'ALIVE', 'ALLUNARE', 'ALMA',
    'AMARA', 'AMATA', 'AMHARA', 'AMI', 'AMINO', 'ANAGRAM', 'ANATOLIA', 'ANDES', 'ANDROID',
    'AQUILA', 'ARABES', 'ARABICA', 'ARDOR', 'ARENAS', 'ARIA', 'ARMONIA', 'ARMOR', 'ARRAY',
    'ARTY', 'ASHANTI', 'ASHIDE', 'ATLAS', 'AURORA', 'AZURA', 'BALI', 'BALLET', 'BAMBUS',
    'BARK', 'BARKLEY', 'BASKET VILL', 'BATTENS', 'BEECH', 'BEETHOVEN', 'BENGAL', 'BENIN',
    'BENVENUTO', 'BERLIN', 'BERMUDA', 'BEYS', 'BISCUIT', 'BLADE', 'BLANCO', 'BLEARY',
    'BLISS', 'BLIZZARD', 'BLOIS', 'BODA', 'BODEN', 'BOTAN', 'BOTANICA', 'BOURBON', 'BROCART',
    'BRODERIE', 'BUBBLE BEE', 'BUNCH', 'CABARET', 'CAIRO', 'CALISTA', 'CANARI', 'CANBERRA',
    'CANTAR', 'CAPPIO', 'CARNEA', 'CARROLL', 'CASCADA', 'CATER', 'CATWALK', 'CELEBRAZ',
    'CELLULOSE', 'CERRADO', 'CHABLIS', 'CHACHACHA', 'CHACHACHA-AM', 'CHAMBER', 'CHAMBORD',
    'CHAMPA DIMOUT', 'CHARCOAL-AM', 'CHECKERS', 'CHERISH', 'CHEZ PAUL', 'CHINOISE', 'CHOTY',
    'CICLO', 'CITADEL', 'CLARET', 'CLASICO', 'CLASSIC-AM', 'CLEAVE', 'CLIMBER', 'COCOON',
    'COLOMBES', 'COLONIA', 'COLONY', 'COMET', 'CONFETTI', 'CONVEY', 'CORD', 'CORNEA',
    'CORONA', 'CORONA VIVA', 'CORSICA', 'COSTA', 'COVE', 'CRADLE', 'CRAFT', 'CROSSROAD',
    'CRYSTAL', 'DACCA', 'DAINTREE', 'DARIN', 'DASH', 'DEW', 'DIADEM', 'DISCO', 'DNA',
    'DOLLY', 'DOME', 'DRAGO', 'DRIBBLE', 'DRIFT', 'DRIP', 'DUKE', 'DUX', 'ECLIPSE',
    'EMMANUEL', 'EMPIRE', 'ENAMEL', 'ERICA', 'ESSENCE', 'ESTELLE', 'EUREKA', 'EUROPA',
    'EYES', 'EZY', 'FAIRY', 'FALCON', 'FAYE', 'FERRIS', 'FIDELITY', 'FIDELITY-330',
    'FIJI', 'FILA', 'FILIGRANA', 'FINITURA', 'FLAG', 'FLANNEL', 'FLAP', 'FLORESCA',
    'FLOW', 'FLURRY', 'FLYING BIRDS', 'FOLK', 'FONDNESS', 'FOREST', 'FORESTA', 'FORTE',
    'FORZA', 'FOTICA', 'FRANCO', 'FREESTYLE', 'FRONTIER', 'FROTHY', 'FROTTAGE', 'FURROW',
    'GABRIEL', 'GALA', 'GALENA', 'GALLEON', 'GARDEN', 'GARDENIA', 'GENESIS', 'GEOMETRIC',
    'GERANIUM', 'GLACIER', 'GLAMOUR', 'GLASSY', 'GLITTER', 'GLITTER-AM', 'GLORY', 'GLOSSIE',
    'GLOW', 'GNEISS', 'GOOD LUCK', 'GOTHENBURG', 'GOTHIC', 'GRAINY', 'GRANULAR', 'GRATE',
    'GREENWICH', 'GRIDLOCK', 'GUPTA', 'HACHURE', 'HAGA', 'HAVEN', 'HAZE', 'HAZY',
    'HELINA', 'HERRING', 'HIBISCUS', 'HIMA', 'HIVE', 'HONEY RING', 'HONEYCOMB', 'HORIZON',
    'HOURGLASS', 'HUBBLE', 'HUGO', 'HYBRID', 'HYPER LINK', 'ICE SHEET', 'ICECUBE118',
    'IKAT', 'ILLUSION', 'IMPALA', 'INDAH', 'INFINITE', 'INSIDER', 'IRIDA', 'ISAAC',
    'IVY', 'IZMIR', 'JACINTHA', 'JACKSON', 'JAZZ', 'JESTER', 'JEWEL', 'JIN', 'JOLI',
    'JUKSAAN', 'JUNO', 'KALA', 'KARIMAH', 'KAWA', 'KAYA', 'KENT', 'KEUKENHOF', 'KINNARI',
    'KLEON', 'KNIGHT', 'KOISHI', 'KOPING', 'KOTABHARU', 'KUIPER', 'KUNGSAI', 'KUSA',
    'LACCIO', 'LACY', 'LAMELLAR', 'LATINO', 'LATO', 'LATTICE', 'LAYLINE', 'LEAF DANCE',
    'LELOUVRE', 'LIBERTY', 'LICHEN', 'LIGHTPILLAR', 'LIGNEE', 'LILY', 'LIMONA', 'LINDA',
    'LINN', 'LIQUOR', 'LOIRE', 'LOLARY', 'LONERO', 'LORENZ', 'LP001', 'LP002', 'LP003',
    'LP004', 'LP005', 'LP007', 'LP010', 'LP011', 'LP012', 'LP013', 'LP014', 'LP016',
    'LP018', 'LP021', 'LP022', 'LULLABY', 'MACARONI', 'MADRIGAL', 'MAGGA', 'MALAGA',
    'MANGA', 'MARCEL', 'MARIA', 'MARIGOLD', 'MARLIN-AM', 'MASHA', 'MASSAI', 'MAURI',
    'MAYFAIR', 'MAZY', 'MEESHIA', 'MERIT', 'MERMAID', 'MESH', 'METRIO', 'MEZZANINE',
    'MICARE', 'MILD', 'MINERAL', 'MIRACLE', 'MISTILY', 'MISTWOOD', 'MISU', 'MOCKLINE',
    'MOD', 'MONEISS', 'MONEISS-FP', 'MONET', 'MONMYSTE', 'MONSOON', 'MONTAGE',
    'MONTIS', 'MOON RIVER', 'MOONSTONE', 'MOONSTONE66', 'MOONSTONE-RE', 'MORNING',
    'MOTIVE', 'MOZART', 'MURATINO', 'MUSICA', 'MYRIAD', 'MYRTLE', 'MYSTIQUE', 'NANA',
    'NASHA', 'NEPAL', 'NETTO', 'NICERE', 'NICKEL', 'NIELLO', 'NIFTY', 'NIGHTFALL',
    'NIRVANA', 'NOBLE', 'NORTH POLE', 'NOUVELLE', 'NUNE', 'OASIS', 'OLEAN', 'OMBRATO',
    'ONESTO', 'OPTICS', 'OPULENCE', 'ORBIT', 'ORDELLA', 'ORGANIC', 'ORIMONO', 'ORION',
    'ORLANDO', 'ORLEANS', 'ORLOFF', 'ORNE', 'ORYZA', 'OSBORNE', 'OSMAN', 'OTTAWA',
    'OVATE', 'PAKAMA', 'PALAWAN', 'PAMPAS', 'PARALLEL', 'PARANA', 'PARAPET', 'PARDIS',
    'PASHA', 'PATHWAY', 'PATINA', 'PATROL', 'PEGASUS', 'PELES', 'PENDANT', 'PENNY',
    'PEONY', 'PEPPERCORN', 'PERFOLIA', 'PERRY', 'PERSEC', 'PHONY', 'PINNATA', 'PINO',
    'PISAC', 'PISCES', 'PIXEL', 'PIZAZZ', 'PLATONY', 'PLENARY', 'PLETHORA', 'POKKY',
    'POLKA DOT', 'POLLENI', 'POTENZA', 'POTENZAC', 'PRAIRIE', 'PREEN', 'PRINCIPE',
    'PRIZE', 'PROFILE', 'PRUNE', 'PULLMAN', 'PUMICE', 'PURIMAS', 'PURITY', 'QUADRATO',
    'QUARTZ', 'R&B-AM', 'RAINBOW', 'RAINFALL', 'REBECCA', 'REBOUND', 'REGALIA', 'REPP',
    'RHODES', 'RHYOLITE', 'RHYTHM', 'RIBBIN', 'RIDDLE', 'RIFFLE', 'RIPTIDE', 'RIVERA',
    'RIVERRUN', 'RIVIERA', 'ROBUSTA', 'ROMA', 'ROMANY', 'ROSALINE', 'ROSARY', 'ROSE',
    'ROSE LEAF', 'ROSES', 'ROSIE', 'ROUTE', 'ROYAL', 'RUBUM', 'RUSTY', 'SACHET',
    'SAFRON', 'SAHARA', 'SAKU', 'SALEM', 'SALSA', 'SAMBA', 'SAMMY', 'SAND DUNES',
    'SANDBANK', 'SANTIAGO', 'SASH', 'SATURN', 'SAVANNAH', 'SAVANT', 'SAVONA', 'SAVVY',
    'SAWAH', 'SAXONY', 'SAXSTREET', 'SCALE', 'SCOTCH', 'SCRIP', 'SEA SAND', 'SEDAN',
    'SEDIMI', 'SEEDS', 'SEINE', 'SELENA', 'SELENA2', 'SENTIER', 'SERENADE', 'SERENE-AM',
    'SHASA', 'SHEBA', 'SHELL', 'SHIBORI', 'SHIRUKU', 'SHISHU', 'SHOJI', 'SHORE',
    'SILK ROAD', 'SILLON', 'SIMILAN', 'SINGULAR', 'SINO', 'SKY PARTY', 'SLING', 'SODA',
    'SOLANO', 'SOLIA', 'SOLO', 'SPA', 'SPARKLE', 'SPARTA', 'SPICY', 'SPRING', 'SQUARE',
    'STALWART', 'STARRY NIGHT', 'STATUE', 'STELLAR', 'STONEWALL', 'STONY', 'STOWFORD',
    'STRAND', 'STREAK', 'STREAM', 'STREAMLINE', 'STRIPE', 'SURFACE', 'SUSONG', 'SWAG',
    'TABHA', 'TAKERIN', 'TAMOAN', 'TANGLE', 'TANGO', 'TARUMI', 'TASSADAR-AM', 'TEMPERA',
    'TEMPO', 'TESSER', 'THAILEAF', 'THEORIS', 'TIGER LILY', 'TISSER COOL', 'TOLEDO',
    'TOPO', 'TORINO', 'TRACK', 'TRAMMEL', 'TRAMMEL2-RE', 'TRANQUIL', 'TRAPEZE',
    'TRIANGLE BIT', 'TRINITY', 'TRIO', 'TRIRON', 'TRIXIE', 'TULLE', 'TUMBA',
    'TWILL ITALIANO', 'TWINS', 'ULTRA VIOLET', 'UMBRA', 'URSULA', 'UZU', 'VAPOR',
    'VENDANGE', 'VENUS', 'VERONESE', 'VICTORIE', 'VIELO', 'VIGNETTE', 'VILLVA', 'VISTA',
    'VITA', 'VIVA', 'VIVIDO', 'VOLTA', 'VOYAGE', 'WAFTY', 'WAGNER', 'WALL', 'WALTZ',
    'WARP', 'WATTLE', 'WEAVE MUSE', 'WEBMESH', 'WELL', 'WILD LIFE', 'WILLOWY', 'WINK',
    'WINTER NIGHT', 'WISP', 'XYLEM', 'ZEBRA', 'ZETA', 'ZILLION', 'ZLEEK', 'ZODIAC',
    'ZULU'
  ],
  employeeAccounts: [
    { id: 'emp-1', name: 'ผู้ดูแลระบบ', username: 'T58121', password: 'Admin', role: 'admin' },
    { id: 'emp-2', name: 'สมชาย มีสุข (Somchai)', username: 'somchai', password: '123', role: 'staff' },
    { id: 'emp-3', name: 'วิภา ศรีงาม (Wipa)', username: 'wipa', password: '123', role: 'visitor' },
    { id: 'emp-4', name: 'มานะ ชูใจ (Mana)', username: 'mana', password: '123', role: 'staff' },
  ]
};

// Beautiful, curated sample images of curtains and home interiors from Unsplash
const SAMPLE_PHOTOS: Omit<PhotoItem, 'id'>[] = [
  {
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    fileName: 'master_bedroom_sheer.jpg',
    fabricDetails: [
      { id: 'f1', name: 'LINEN COMFORT', color: 'White Pearl' },
      { id: 'f2', name: 'SUPER BLOCKOUT 100', color: 'Cocoa Brown' }
    ],
    curtainTypes: ['ผ้าม่านทึบ', 'ผ้าม่านโปร่ง'],
    curtainStyle: 'ม่านลอน (Ripple Fold Curtain)',
    hashtags: ['Sheer (ผ้าโปร่ง)', 'Blackout (กันแสง 100%)', 'Earth Tone (โทนสีธรรมชาติ)', 'Bright & Airy (สว่างโปร่งเบา)'],
    presetId: 'bright-minimal',
    isLiked: true,
    uploadedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(), // 3 days ago
  },
  {
    url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
    fileName: 'living_room_ripplefold.jpg',
    fabricDetails: [
      { id: 'f3', name: 'LUXURY SATIN', color: 'Champagne Gold' }
    ],
    curtainTypes: ['ผ้าม่านทึบ'],
    curtainStyle: 'ม่านลอน (Ripple Fold Curtain)',
    hashtags: ['Dimout (กันแสง 70-90%)', 'Earth Tone (โทนสีธรรมชาติ)', 'Luxury Velvet (กำมะหยี่หรูหรา)'],
    presetId: 'warm-sunset',
    isLiked: false,
    uploadedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
  },
  {
    url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
    fileName: 'minimal_sunlight_sheer.jpg',
    fabricDetails: [
      { id: 'f4', name: 'COTTON BREEZE', color: 'Off-white' }
    ],
    curtainTypes: ['ผ้าม่านโปร่ง'],
    curtainStyle: 'ม่านจีบ (Pleated Curtain)',
    hashtags: ['Sheer (ผ้าโปร่ง)', 'Bright & Airy (สว่างโปร่งเบา)', 'Natural Linen (ผ้าลินินธรรมชาติ)'],
    presetId: 'creamy-dream',
    isLiked: true,
    uploadedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
  {
    url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80',
    fileName: 'condo_gray_pleat.jpg',
    fabricDetails: [
      { id: 'f5', name: 'ULTRA SHIELD UV', color: 'Charcoal Grey' }
    ],
    curtainTypes: ['ผ้าม่านทึบ'],
    curtainStyle: 'ม่านจีบ (Pleated Curtain)',
    hashtags: ['Blackout (กันแสง 100%)', 'Modern Grey (สีเทาทันสมัย)', 'UV Protection (กันแสง UV)'],
    presetId: 'modern-slate',
    isLiked: false,
    uploadedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
  },
  {
    url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
    fileName: 'dining_room_roman.jpg',
    fabricDetails: [
      { id: 'f6', name: 'LINEN TOUCH', color: 'Natural Beige' }
    ],
    curtainTypes: ['ผ้าม่านทึบ'],
    curtainStyle: 'ม่านพับ (Fold / Roman Blind)',
    hashtags: ['Dimout (กันแสง 70-90%)', 'Earth Tone (โทนสีธรรมชาติ)', 'Natural Linen (ผ้าลินินธรรมชาติ)'],
    presetId: 'vintage-soft',
    isLiked: false,
    uploadedAt: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
  },
  {
    url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=80',
    fileName: 'luxury_bedroom_hotel.jpg',
    fabricDetails: [
      { id: 'f7', name: 'SILK ROYAL', color: 'Deep Cream' },
      { id: 'f8', name: 'PREMIUM VOILE', color: 'Snow White' }
    ],
    curtainTypes: ['ผ้าม่านทึบ', 'ผ้าม่านโปร่ง'],
    curtainStyle: 'ม่านลอน (Ripple Fold Curtain)',
    hashtags: ['Blackout (กันแสง 100%)', 'Sheer (ผ้าโปร่ง)', 'Luxury Velvet (กำมะหยี่หรูหรา)', 'Sound Insulation (กันเสียงสะท้อน)'],
    presetId: 'original',
    isLiked: true,
    uploadedAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
  }
];

const INITIAL_INSTALLATIONS = [
  {
    village: 'Narasiri Krungthep Kreetha (นราสิริ กรุงเทพกรีฑา)',
    houseType: 'บ้านเดี่ยว (Single House)',
    developer: 'Sansiri (แสนสิริ)',
    photoIndex: 0
  },
  {
    village: 'Centro Ratchapruek (เซนโทร ราชพฤกษ์)',
    houseType: 'บ้านเดี่ยว (Single House)',
    developer: 'AP Thailand',
    photoIndex: 1
  },
  {
    village: 'Airi Chaengwattana (ไอยริ แจ้งวัฒนะ)',
    houseType: 'บ้านเดี่ยว (Single House)',
    developer: 'Ananda Development',
    photoIndex: 2
  },
  {
    village: 'The Line Sukhumvit 101 (เดอะ ไลน์ สุขุมวิท 101)',
    houseType: 'คอนโดมิเนียม (Condominium)',
    developer: 'Sansiri (แสนสิริ)',
    photoIndex: 3
  },
  {
    village: 'Pleno Suksawat (พลีโน่ สุขสวัสดิ์)',
    houseType: 'ทาวน์โฮม (Townhome)',
    developer: 'AP Thailand',
    photoIndex: 4
  },
  {
    village: 'Grand Bangkok Boulevard (แกรนด์ บางกอก บูเลอวาร์ด)',
    houseType: 'บ้านเดี่ยว (Single House)',
    developer: 'SC Asset',
    photoIndex: 5
  }
];

// Initialize DB and Seed Data online
export async function initDB(): Promise<void> {
  try {
    // 1. Initialise master configs settings if not present
    const settingsDocRef = doc(db, SETTINGS_COLLECTION, 'masterData');
    const settingsDocSnap = await getDoc(settingsDocRef);
    let dbSeeded = false;

    if (!settingsDocSnap.exists()) {
      // New Database: Set initial master data settings with dbSeeded false
      const initialData = { ...DEFAULT_MASTER_DATA, dbSeeded: false };
      await setDoc(settingsDocRef, initialData);
      dbSeeded = false;
    } else {
      const data = settingsDocSnap.data() as MasterDataConfigs;
      dbSeeded = data.dbSeeded === true;
    }

    // 2. Initialise photos if we haven't seeded yet
    if (!dbSeeded) {
      const photosColRef = collection(db, PHOTOS_COLLECTION);
      const photosSnap = await getDocs(photosColRef);
      
      if (photosSnap.empty) {
        for (let index = 0; index < INITIAL_INSTALLATIONS.length; index++) {
          const inst = INITIAL_INSTALLATIONS[index];
          const photoData = SAMPLE_PHOTOS[inst.photoIndex];
          const id = `seed-photo-${index}`;
          const item: SavedPhotoItem = {
            ...photoData,
            id,
            villageName: inst.village,
            houseType: inst.houseType,
            developer: inst.developer,
            employee: 'ระบบอัตโนมัติ (System)'
          };
          await setDoc(doc(db, PHOTOS_COLLECTION, id), item);
        }
        
        // Save logs
        await saveUserLog('upload', 'ระบบอัตโนมัติ (System)', 'ติดตั้งข้อมูลตัวอย่างผลงาน 6 รายการเสร็จสมบูรณ์');
      }

      // Mark database as seeded in settings so we NEVER auto-seed again even if all photos are deleted
      await setDoc(settingsDocRef, { dbSeeded: true }, { merge: true });
    }
  } catch (err) {
    console.error('Error during initDB:', err);
    throw err;
  }
}

// Get all photos from Firestore
export async function getAllPhotos(): Promise<SavedPhotoItem[]> {
  try {
    const querySnapshot = await getDocs(collection(db, PHOTOS_COLLECTION));
    const list: SavedPhotoItem[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as SavedPhotoItem;
      // Sanitize old employee name
      if (data.employee === 'สมศักดิ์ รักดี (Somsak)' || data.employee === 'Somsak' || data.employeeId === 'somsak') {
        data.employee = 'ผู้ดูแลระบบ';
        data.employeeId = 'T58121';
      }
      list.push(data);
    });
    // Sort by uploadedAt descending
    return list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  } catch (err) {
    console.error('Error in getAllPhotos:', err);
    return [];
  }
}

// Save photo to Firestore
export async function savePhoto(photo: SavedPhotoItem): Promise<void> {
  try {
    // Ensure formatting guidelines for fabric name & color are applied
    const formattedFabricDetails = photo.fabricDetails.map(f => ({
      ...f,
      name: formatFabricName(f.name),
      color: formatFabricColor(f.color)
    }));

    const finalPhoto: SavedPhotoItem = {
      ...photo,
      fabricDetails: formattedFabricDetails
    };

    await setDoc(doc(db, PHOTOS_COLLECTION, photo.id), finalPhoto);
  } catch (err) {
    console.error('Error in savePhoto:', err);
    throw err;
  }
}

// Toggle photo like state in Firestore for a specific user
export async function toggleLikePhoto(id: string, userId: string): Promise<boolean> {
  try {
    const docRef = doc(db, PHOTOS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as SavedPhotoItem;
      let likedBy = data.likedBy || [];
      const hasLiked = likedBy.includes(userId);
      let newLikedState = false;
      if (hasLiked) {
        likedBy = likedBy.filter(uid => uid !== userId);
        newLikedState = false;
      } else {
        likedBy = [...likedBy, userId];
        newLikedState = true;
      }
      await setDoc(docRef, { ...data, likedBy, isLiked: likedBy.length > 0 });
      return newLikedState;
    }
    throw new Error('Photo not found');
  } catch (err) {
    console.error('Error in toggleLikePhoto:', err);
    throw err;
  }
}

// Delete photo from Firestore
export async function deletePhoto(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, PHOTOS_COLLECTION, id));
  } catch (err) {
    console.error('Error in deletePhoto:', err);
    throw err;
  }
}

// Update single photo in Firestore
export async function updatePhoto(id: string, updatedFields: Partial<SavedPhotoItem>): Promise<void> {
  try {
    const docRef = doc(db, PHOTOS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as SavedPhotoItem;
      const merged = { ...data, ...updatedFields };
      
      // Enforce formatting guidelines for fabric name & color if they were updated
      if (updatedFields.fabricDetails) {
        merged.fabricDetails = updatedFields.fabricDetails.map(f => ({
          ...f,
          name: formatFabricName(f.name),
          color: formatFabricColor(f.color)
        }));
      }
      
      await setDoc(docRef, merged);
    } else {
      throw new Error('Photo not found');
    }
  } catch (err) {
    console.error('Error in updatePhoto:', err);
    throw err;
  }
}

// Update multiple photos in Firestore (as a batch update)
export async function updateBatchPhotos(ids: string[], updatedFields: Partial<SavedPhotoItem>): Promise<void> {
  try {
    const batch = writeBatch(db);
    
    // Format fabric details if they are being updated
    let formattedFabrics = updatedFields.fabricDetails;
    if (formattedFabrics) {
      formattedFabrics = formattedFabrics.map(f => ({
        ...f,
        name: formatFabricName(f.name),
        color: formatFabricColor(f.color)
      }));
    }

    for (const id of ids) {
      const docRef = doc(db, PHOTOS_COLLECTION, id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as SavedPhotoItem;
        const merged = { ...data, ...updatedFields };
        if (formattedFabrics) {
          merged.fabricDetails = formattedFabrics;
        }
        batch.set(docRef, merged);
      }
    }
    
    await batch.commit();
  } catch (err) {
    console.error('Error in updateBatchPhotos:', err);
    throw err;
  }
}

// Activity Logging functions
export async function saveUserLog(
  action: 'upload' | 'delete' | 'like' | 'unlike' | 'admin_config_update',
  employeeName: string,
  details: string
): Promise<void> {
  try {
    const id = `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const logItem: UserLog = {
      id,
      action,
      employeeName: employeeName || 'ไม่ระบุพนักงาน (Guest)',
      details,
      timestamp: new Date().toISOString()
    };
    await setDoc(doc(db, LOGS_COLLECTION, id), logItem);
  } catch (err) {
    console.error('Error in saveUserLog:', err);
  }
}

export async function getUserLogs(): Promise<UserLog[]> {
  try {
    const querySnapshot = await getDocs(collection(db, LOGS_COLLECTION));
    const logs: UserLog[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as UserLog;
      if (data.employeeName === 'สมศักดิ์ รักดี (Somsak)' || data.employeeName === 'Somsak') {
        data.employeeName = 'ผู้ดูแลระบบ';
      }
      logs.push(data);
    });
    // Sort by timestamp descending
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (err) {
    console.error('Error in getUserLogs:', err);
    return [];
  }
}

// Delete individual log
export async function deleteUserLog(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, LOGS_COLLECTION, id));
  } catch (err) {
    console.error('Error in deleteUserLog:', err);
    throw err;
  }
}

// Batch delete logs
export async function deleteUserLogs(ids: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    ids.forEach(id => {
      batch.delete(doc(db, LOGS_COLLECTION, id));
    });
    await batch.commit();
  } catch (err) {
    console.error('Error in deleteUserLogs:', err);
    throw err;
  }
}

// Clear logs for a specific day (YYYY-MM-DD)
export async function deleteUserLogsByDate(dateStr: string): Promise<number> {
  try {
    const qSnapshot = await getDocs(collection(db, LOGS_COLLECTION));
    const batch = writeBatch(db);
    let count = 0;
    qSnapshot.forEach((doc) => {
      const data = doc.data() as UserLog;
      // Compare substring of timestamp prefix with dateStr
      if (data.timestamp.startsWith(dateStr)) {
        batch.delete(doc.ref);
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
    }
    return count;
  } catch (err) {
    console.error('Error in deleteUserLogsByDate:', err);
    throw err;
  }
}

// Master configurations settings functions
export async function getMasterData(): Promise<MasterDataConfigs> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'masterData');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as MasterDataConfigs;
      
      // Merge default Cloudinary settings if missing
      if (data.cloudinaryEnabled === undefined) {
        data.cloudinaryEnabled = DEFAULT_MASTER_DATA.cloudinaryEnabled;
      }
      if (!data.cloudinaryCloudName) {
        data.cloudinaryCloudName = DEFAULT_MASTER_DATA.cloudinaryCloudName;
      }
      if (!data.cloudinaryUploadPreset) {
        data.cloudinaryUploadPreset = DEFAULT_MASTER_DATA.cloudinaryUploadPreset;
      }

      if (!data.employeeAccounts || data.employeeAccounts.length === 0) {
        data.employeeAccounts = DEFAULT_MASTER_DATA.employeeAccounts;
      }
      
      let changed = false;

      if (!data.fabrics || !Array.isArray(data.fabrics) || data.fabrics.length === 0) {
        data.fabrics = DEFAULT_MASTER_DATA.fabrics;
        changed = true;
      }

      // Migrate employee names if 'สมศักดิ์ รักดี (Somsak)' exists
      if (data.employees) {
        const somsakEmpIdx = data.employees.indexOf('สมศักดิ์ รักดี (Somsak)');
        if (somsakEmpIdx !== -1) {
          data.employees[somsakEmpIdx] = 'ผู้ดูแลระบบ';
          changed = true;
        }
      }

      if (data.employeeAccounts) {
        data.employeeAccounts.forEach(acc => {
          if (acc.name === 'สมศักดิ์ รักดี (Somsak)') {
            acc.name = 'ผู้ดูแลระบบ';
            changed = true;
          }
        });
      }
      
      // Migrate and ensure T58121 (Admin) account is present
      const hasT58121 = data.employeeAccounts.some(acc => acc.username.toLowerCase() === 't58121');
      if (!hasT58121) {
        const somsakIdx = data.employeeAccounts.findIndex(acc => acc.username.toLowerCase() === 'somsak');
        if (somsakIdx !== -1) {
          data.employeeAccounts[somsakIdx] = {
            ...data.employeeAccounts[somsakIdx],
            name: 'ผู้ดูแลระบบ',
            username: 'T58121',
            password: 'Admin',
            role: 'admin'
          };
        } else {
          data.employeeAccounts.push({
            id: 'emp-1',
            name: 'ผู้ดูแลระบบ',
            username: 'T58121',
            password: 'Admin',
            role: 'admin'
          });
        }
        changed = true;
      } else {
        // Ensure its password is exact
        const adminAcc = data.employeeAccounts.find(acc => acc.username.toLowerCase() === 't58121');
        if (adminAcc && adminAcc.password !== 'Admin') {
          adminAcc.password = 'Admin';
          changed = true;
        }
      }

      if (changed) {
        await setDoc(docRef, data);
      }

      return data;
    }
    return DEFAULT_MASTER_DATA;
  } catch (err) {
    console.error('Error in getMasterData:', err);
    return DEFAULT_MASTER_DATA;
  }
}

export async function saveMasterData(configs: MasterDataConfigs): Promise<void> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'masterData');
    await setDoc(docRef, configs);
  } catch (err) {
    console.error('Error in saveMasterData:', err);
    throw err;
  }
}
