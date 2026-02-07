---
description: วิธี Deploy เว็บไปยัง Vercel (return-neosiam.vercel.app)
---

# Deploy to Vercel

## วิธีที่ 1: ใช้ Vercel CLI (แนะนำ)

// turbo
1. เปิด Terminal ใน project folder แล้วรัน:
```bash
vercel deploy --prod --archive=tgz
```
> ⚠️ ต้องใช้ `--archive=tgz` เสมอ เพราะ Vercel CLI จะ error "Missing files" ถ้าไม่ใส่ flag นี้

## วิธีที่ 2: ใช้ Git Push (Auto Deploy)

หากเชื่อมต่อ GitHub แล้ว ทุกครั้งที่ push ไปยัง main branch จะ deploy อัตโนมัติ:

```bash
git add .
git commit -m "Update: รายละเอียดการเปลี่ยนแปลง"
git push origin main
```

## URL ของเว็บ

- **Production:** https://return-neosiam.vercel.app
- **Dashboard:** https://vercel.com/prats-projects-95416bd3/return-neosiam

## หมายเหตุ

- ใช้เวลา Deploy ประมาณ 20-30 วินาที
- ตรวจสอบ Build log ได้ที่ Vercel Dashboard หากมีปัญหา
