# Design System Usage Guide

> ตัวอย่างการใช้งาน UI Components ที่สร้างตาม Skills Best Practices

---

## 📦 การ Import Components

```tsx
// Import จาก UI Components
import { 
  Button, 
  Card, CardHeader, CardContent, CardFooter,
  Input, 
  Badge, 
  LoadingSpinner, LoadingOverlay, Skeleton,
  StatCard,
  Modal, ModalFooter,
  Select,
  Tooltip,
  EmptyState
} from './components/ui';

// Import Hooks
import { useReducedMotion, useLocalStorage } from './hooks';

// Import Utilities
import { 
  debounce, 
  throttle, 
  memoize, 
  formatNumber, 
  formatCurrency, 
  formatDate 
} from './utils/performance';

import { 
  CHART_COLORS, 
  CHART_PALETTE, 
  getStatusColor 
} from './utils/chartColors';

import { 
  announceToScreenReader, 
  trapFocus 
} from './utils/accessibility';
```

---

## 🔘 Button Component

```tsx
// Primary Button
<Button variant="primary" onClick={handleClick}>
  บันทึกข้อมูล
</Button>

// With Icon
<Button variant="primary" leftIcon={<Save className="w-4 h-4" />}>
  บันทึก
</Button>

// Loading State
<Button variant="primary" isLoading>
  กำลังบันทึก...
</Button>

// Different Variants
<Button variant="secondary">ยกเลิก</Button>
<Button variant="danger">ลบ</Button>
<Button variant="success">อนุมัติ</Button>
<Button variant="ghost">ดูเพิ่มเติม</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

---

## 🃏 Card Component

```tsx
// Basic Card
<Card>
  <CardHeader 
    title="รายการสินค้า" 
    subtitle="ข้อมูลล่าสุด"
    icon={<Package className="w-5 h-5" />}
    action={<Button size="sm">ดูทั้งหมด</Button>}
  />
  <CardContent>
    {/* Content here */}
  </CardContent>
  <CardFooter>
    <Button variant="ghost">ยกเลิก</Button>
    <Button variant="primary">บันทึก</Button>
  </CardFooter>
</Card>

// Card Variants
<Card variant="glass">Glass Effect</Card>
<Card variant="elevated">Elevated Shadow</Card>
<Card variant="outline">Outline Only</Card>

// Hoverable Card
<Card hoverable onClick={() => navigate('/detail')}>
  Click me
</Card>
```

---

## 📝 Input Component

```tsx
// Basic Input
<Input 
  label="ชื่อสินค้า"
  placeholder="กรอกชื่อสินค้า"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>

// With Icons
<Input 
  label="ค้นหา"
  leftIcon={<Search className="w-5 h-5" />}
  placeholder="ค้นหาสินค้า..."
/>

// With Error
<Input 
  label="อีเมล"
  error="กรุณากรอกอีเมลให้ถูกต้อง"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>

// Dark Variant (for dark backgrounds)
<Input 
  variant="dark"
  label="Password"
  type="password"
/>

// Sizes
<Input size="sm" placeholder="Small" />
<Input size="md" placeholder="Medium" />
<Input size="lg" placeholder="Large" />
```

---

## 🏷️ Badge Component

```tsx
// Basic Badge
<Badge>Default</Badge>

// Variants
<Badge variant="success">อนุมัติแล้ว</Badge>
<Badge variant="warning">รอดำเนินการ</Badge>
<Badge variant="danger">ยกเลิก</Badge>
<Badge variant="info">ข้อมูล</Badge>
<Badge variant="purple">พิเศษ</Badge>

// With Dot Indicator
<Badge variant="success" dot>Online</Badge>

// Sizes
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
<Badge size="lg">Large</Badge>
```

---

## 📊 StatCard Component

```tsx
// Basic StatCard
<StatCard 
  title="Total Orders"
  value="1,234"
  subtitle="รายการทั้งหมด"
  icon={<Package className="w-6 h-6" />}
/>

// With Trend
<StatCard 
  title="Revenue"
  value="฿125,000"
  trend={{ value: 12.5, isPositive: true }}
  variant="success"
/>

// Variants
<StatCard variant="primary" title="Primary" value="100" />
<StatCard variant="success" title="Success" value="200" />
<StatCard variant="warning" title="Warning" value="50" />
<StatCard variant="danger" title="Danger" value="10" />
```

---

## 🪟 Modal Component

```tsx
const [isOpen, setIsOpen] = useState(false);

<Button onClick={() => setIsOpen(true)}>Open Modal</Button>

<Modal 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)}
  title="ยืนยันการดำเนินการ"
  size="md"
>
  <p>คุณต้องการดำเนินการต่อหรือไม่?</p>
  
  <ModalFooter>
    <Button variant="ghost" onClick={() => setIsOpen(false)}>
      ยกเลิก
    </Button>
    <Button variant="primary" onClick={handleConfirm}>
      ยืนยัน
    </Button>
  </ModalFooter>
</Modal>

// Sizes: sm, md, lg, xl, full
<Modal size="lg" ... />
```

---

## 📋 Select Component

```tsx
const options = [
  { value: 'restock', label: 'ขาย (Restock)' },
  { value: 'rtv', label: 'ส่งคืน (RTV)' },
  { value: 'claim', label: 'เคลม (Claim)' },
];

<Select 
  label="การจัดการ"
  options={options}
  placeholder="เลือกการจัดการ"
  value={disposition}
  onChange={(e) => setDisposition(e.target.value)}
/>

// With Error
<Select 
  label="สาขา"
  options={branchOptions}
  error="กรุณาเลือกสาขา"
/>
```

---

## 💬 Tooltip Component

```tsx
<Tooltip content="คลิกเพื่อดูรายละเอียด">
  <Button variant="ghost">
    <Info className="w-4 h-4" />
  </Button>
</Tooltip>

// Positions
<Tooltip content="Top" position="top">...</Tooltip>
<Tooltip content="Bottom" position="bottom">...</Tooltip>
<Tooltip content="Left" position="left">...</Tooltip>
<Tooltip content="Right" position="right">...</Tooltip>
```

---

## 📭 EmptyState Component

```tsx
<EmptyState 
  icon={<FileQuestion className="w-10 h-10" />}
  title="ไม่พบข้อมูล"
  description="ยังไม่มีรายการสินค้าในระบบ"
  action={
    <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
      เพิ่มรายการใหม่
    </Button>
  }
/>
```

---

## ⏳ Loading Components

```tsx
// Spinner
<LoadingSpinner size="sm" />
<LoadingSpinner size="md" variant="primary" />
<LoadingSpinner size="lg" variant="white" />

// Full Page Overlay
<LoadingOverlay message="กำลังโหลดข้อมูล..." />

// Skeleton Loading
<Skeleton className="h-4 w-full" variant="text" />
<Skeleton className="h-12 w-12" variant="circular" />
<Skeleton className="h-32 w-full" variant="rectangular" />
```

---

## 🪝 Custom Hooks

### useReducedMotion

```tsx
import { useReducedMotion } from './hooks';

function AnimatedComponent() {
  const prefersReducedMotion = useReducedMotion();
  
  return (
    <div className={prefersReducedMotion ? '' : 'animate-slide-up'}>
      Content
    </div>
  );
}
```

### useLocalStorage

```tsx
import { useLocalStorage } from './hooks';

function Settings() {
  const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'light', {
    version: 1,
  });
  
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Toggle Theme: {theme}
    </button>
  );
}
```

---

## 🛠️ Utility Functions

### Performance Utilities

```tsx
import { debounce, throttle, formatNumber, formatCurrency, formatDate } from './utils/performance';

// Debounce search input
const handleSearch = debounce((query: string) => {
  fetchResults(query);
}, 300);

// Throttle scroll handler
const handleScroll = throttle(() => {
  updateScrollPosition();
}, 100);

// Format numbers
formatNumber(1234567);        // "1,234,567"
formatCurrency(1500);         // "฿1,500.00"
formatDate(new Date());       // "4 ก.พ. 2569"
```

### Chart Colors

```tsx
import { CHART_COLORS, getStatusColor, getPaletteColor } from './utils/chartColors';

// Use predefined colors
<Bar fill={CHART_COLORS.Restock} />

// Get color by status
const color = getStatusColor('RTV'); // "#f59e0b"

// Get color from palette by index
const colors = data.map((_, i) => getPaletteColor(i));
```

### Accessibility

```tsx
import { announceToScreenReader, trapFocus } from './utils/accessibility';

// Announce to screen readers
announceToScreenReader('บันทึกข้อมูลสำเร็จ', 'polite');

// Trap focus in modal
useEffect(() => {
  if (isOpen && modalRef.current) {
    const cleanup = trapFocus(modalRef.current);
    return cleanup;
  }
}, [isOpen]);
```

---

## ✅ Best Practices Checklist

### จาก UI/UX Pro Max Skill:
- [ ] ใช้ `cursor-pointer` กับทุก element ที่คลิกได้
- [ ] Touch target ขั้นต่ำ 44x44px
- [ ] Color contrast อย่างน้อย 4.5:1
- [ ] ทุก input มี label
- [ ] ไม่ใช้ emoji เป็น icon (ใช้ Lucide React)

### จาก Vercel React Best Practices:
- [ ] ใช้ `React.memo()` กับ expensive components
- [ ] ใช้ ternary `? :` แทน `&&` ใน conditional rendering
- [ ] ใช้ `Promise.all()` สำหรับ parallel async operations
- [ ] Lazy load heavy components ด้วย dynamic import

### จาก Frontend Design Skill:
- [ ] Typography ใช้ font ที่โดดเด่น (Sarabun + Inter)
- [ ] Animation ใช้ transform/opacity เท่านั้น
- [ ] Hover states ไม่ทำให้ layout shift
- [ ] Glass effects มองเห็นได้ทั้ง light และ dark mode

---

*Last Updated: 2026-02-04*
