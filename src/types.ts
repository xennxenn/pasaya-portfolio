export interface FabricItem {
  id: string;
  name: string; // ชื่อผ้า
  color: string; // สีผ้า
}

export interface PhotoItem {
  id: string;
  url: string; // Base64 or Unsplash CDN URL
  fileName: string;
  fabricDetails: FabricItem[]; // รายชื่อชื่อผ้าและสีผ้า
  curtainTypes: string[]; // ['Block-out' (ทึบ), 'Sheer' (โปร่ง)]
  curtainStyle: string; // ม่านจีบ, ม่านลอน, ม่านพับ, etc.
  hashtags: string[]; // Black out, Dim out, Sheer, etc.
  presetId: string; // Color adjustment preset
  isLiked: boolean;
  uploadedAt: string;
}

export interface SavedPhotoItem extends PhotoItem {
  villageName: string;
  houseType: string;
  developer: string;
  employee?: string; // พนักงานที่รับผิดชอบ
  employeeId?: string; // ID ของพนักงานที่อัปโหลด เพื่อให้ตรวจสอบสิทธิ์แก้ไขได้ถูกต้อง
  likedBy?: string[]; // รายชื่อ ID หรือ username ของพนักงานที่กดถูกใจรูปนี้
  batchId?: string; // รหัสกลุ่มอัปโหลดพร้อมกัน
}

export interface EmployeeUser {
  id: string;
  name: string; // ชื่อพนักงาน
  username: string;
  password?: string; // รหัสผ่าน
  role: 'admin' | 'staff' | 'visitor'; // ประเภทการใช้งาน (เช่น แอดมิน พนักงาน ผู้เยี่ยมชม)
}

export interface UserLog {
  id: string;
  action: 'upload' | 'delete' | 'like' | 'unlike' | 'admin_config_update';
  employeeName: string; // ชื่อพนักงานที่ทำรายการ
  details: string; // รายละเอียดการทำรายการ
  timestamp: string; // ISO-8601 string
}

export interface MasterDataConfigs {
  curtainStyles: string[];
  hashtags: string[];
  houseTypes: string[];
  employees: string[];
  developers: string[];
  employeeAccounts?: EmployeeUser[];
  logoUrl?: string; // URL หรือ Base64 ของโลโก้แอปพลิเคชันที่แอดมินอัปโหลดเอง
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  cloudinaryEnabled?: boolean;
  dbSeeded?: boolean;
}

export interface CurtainInstallation {
  id: string;
  villageName: string; // ชื่อหมู่บ้าน
  houseType: string; // ประเภทบ้าน
  developer: string; // Developer
  uploadedAt: string;
  photos: PhotoItem[];
}

export interface ImagePreset {
  id: string;
  name: string; // Preset name (TH/EN)
  cssFilter: string; // CSS Filter representation
  description: string;
}

export interface UploadProgress {
  id: string;
  villageName: string;
  progress: number; // 0 to 100
  status: 'uploading' | 'completed' | 'failed';
  totalPhotos: number;
}

// Preset configurations
export const COLOR_PRESETS: ImagePreset[] = [
  { id: 'original', name: 'Original (ไม่แต่งสี)', cssFilter: 'none', description: 'สีสันต้นฉบับดั้งเดิม' },
  { id: 'warm-sunset', name: 'Warm Sunset (อบอุ่นโฮมมี่)', cssFilter: 'sepia(0.25) saturate(1.25) hue-rotate(-8deg) brightness(1.03)', description: 'โทนอบอุ่น แสงเย็น ละมุนตา' },
  { id: 'nordic-cool', name: 'Nordic Cool (มินิมอลคูล)', cssFilter: 'saturate(0.8) contrast(1.05) brightness(1.02) hue-rotate(5deg)', description: 'โทนเย็น สะอาดตา ดูพรีเมียม' },
  { id: 'cinematic', name: 'Cinematic (ฟิล์มภาพยนตร์)', cssFilter: 'contrast(1.15) saturate(0.9) brightness(0.95) sepia(0.08)', description: 'โทนภาพยนตร์ มีเสน่ห์แบบคลาสสิก' },
  { id: 'creamy-dream', name: 'Creamy Dream (ครีมนุ่มนวล)', cssFilter: 'sepia(0.12) contrast(0.92) brightness(1.08) saturate(1.1)', description: 'โทนสีครีม ซอฟต์สว่าง สบายใจ' },
  { id: 'vibrant-luxury', name: 'Vibrant Luxury (หรูหราสดใส)', cssFilter: 'saturate(1.35) contrast(1.1) brightness(1.04)', description: 'ดึงสีเด่นชัด เหมาะกับผ้าสีสด' },
  { id: 'vintage-soft', name: 'Vintage Soft (วินเทจละมุน)', cssFilter: 'sepia(0.35) contrast(0.88) brightness(1.04) saturate(0.85)', description: 'ความรู้สึกอบอุ่น คลาสสิกย้อนยุค' },
  { id: 'modern-slate', name: 'Modern Slate (โมเดิร์นเข้ม)', cssFilter: 'contrast(1.25) saturate(0.75) brightness(0.94)', description: 'เน้นสีเทา ดำ และความลุ่มลึก' },
  { id: 'bright-minimal', name: 'Bright Minimal (สว่างโปร่งเบา)', cssFilter: 'brightness(1.12) contrast(0.95) saturate(0.92)', description: 'สว่างฟุ้ง ดูโปร่งสบายและกว้างขวาง' },
];

export const HOUSE_TYPES = [
  'บ้านเดี่ยว (Single House)',
  'ทาวน์โฮม (Townhome)',
  'คอนโดมิเนียม (Condominium)',
  'อาคารพาณิชย์ (Commercial Building)',
  'โฮมออฟฟิศ (Home Office)',
  'เพนต์เฮาส์ (Penthouse)',
];

export const DEVELOPERS = [
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
];

export const CURTAIN_STYLES = [
  'ม่านจีบ (Pleated Curtain)',
  'ม่านลอน (Ripple Fold Curtain)',
  'ม่านพับ (Fold / Roman Blind)',
  'ม่านตาไก่ (Eyelet Curtain)',
  'ม่านคอกระเช้า (Tab Top Curtain)',
  'ม่านม้วน (Roller Blind)',
  'ม่านมู่ลี่ (Venetian Blind)',
];

export const HASHTAG_PRESETS = [
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
];
