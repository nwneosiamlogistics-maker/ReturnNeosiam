# 📧 **รายการ User Accounts สำหรับ Login**

## ✅ **User Accounts ที่พร้อมใช้งาน (อัพเดทแล้ว)**

**Password Admin:** `888`
**Password อื่นๆ:** `1234`

---

### **1. ADMIN (ผู้ดูแลระบบ)**

```yaml
Email: admin@neosiam.com
Password: 888
ชื่อแสดง: System Admin
```

---

### **2. NCR_OPERATOR (พนักงาน NCR)**

```yaml
Email: ncr@neosiam.com
Password: 1234
ชื่อแสดง: NCR Staff Operators
```

---

### **3. COL_OPERATOR (พนักงาน Collection)**

```yaml
Email: col@neosiam.com
Password: 1234
ชื่อแสดง: COL Staff
```

---

### **4. REQUEST_ENTRY (พนักงานคีย์ใบสั่งงาน)**

```yaml
Email: request@neosiam.com
Password: 1234
ชื่อแสดง: COL Staff REQUEST Operators
```

---

### **5. QC_OPERATOR (พนักงาน QC)**

```yaml
Email: qc@neosiam.com
Password: 1234
ชื่อแสดง: QC Inspector
```

---

### **6. CLOSURE_OPERATOR (พนักงานปิดงาน)**

```yaml
Email: closure@neosiam.com
Password: 1234
ชื่อแสดง: Closure Staff
```

---

### **7. VIEWER (ผู้ดูข้อมูล/ผู้จัดการ)**

```yaml
Email: viewer@neosiam.com
Password: 1234
ชื่อแสดง: Ops Manager
```

---

## 🚀 **วิธีทดสอบ**

### **Login ด้วย Form**

1. เปิดเบราว์เซอร์: `http://localhost:3000`
2. กรอก Email และ Password
3. คลิก "เข้าสู่ระบบ"

### **Quick Login (Development)**

คลิกที่รูป User ด้านขวาเพื่อ Login ทันที

---

## 📝 **สรุปการเปลี่ยนแปลง**

**เดิม:** Password = `8888`  
**ใหม่:** Admin = `888`, Others = `1234`

✅ แยกสิทธิ์ Admin และ User ชัดเจน
✅ Password Admin สั้นกระชับ (888)
✅ Password User มาตรฐาน (1234)
