import Swal from 'sweetalert2';
import ExcelJS from 'exceljs';
import { ReturnRecord } from '../../../types';
import { BRANCH_LIST } from '../../../constants';

// --- Configuration & Helpers ---

const FIELD_ALIASES: Record<string, string[]> = {
    documentNo: ['doc_no', 'docNo', 'r_no', 'rNo', 'เลขที่เอกสาร', 'เลขที่ใบรับคืน', 'document_no', 'documentNo', 'rnumber', 'returnno', 'refno', 'reference'],
    date: ['date', 'วันที่', 'วันที่เอกสาร', 'dateofdoc'],
    customerCode: ['soldto_id', 'customer_code', 'รหัสลูกค้า', 'custcode', 'customercode'],
    customerName: ['soldto_name', 'customer_name', 'ชื่อลูกค้า', 'customer', 'custname', 'shopname', 'ชื่อร้านค้า', 'ร้านค้า'],
    destinationCustomer: ['shipto_name', 'destination', 'ลูกค้าปลายทาง', 'สถานที่ส่ง', 'ปลายทาง', 'shiptoname', 'receiver'],
    customerAddress: ['shipto_address', 'address', 'ที่อยู่', 'สถานที่จัดส่ง', 'shiptoaddress', 'deliveryaddress'],

    productCode: ['sku_id', 'product_code', 'รหัสสินค้า', 'itemcode', 'material', 'partno'],
    productName: ['sku_name', 'product_name', 'ชื่อสินค้า', 'รายการสินค้า', 'itemname', 'description', 'materialdescription', 'product', 'สินค้า', 'รายการ'],
    quantity: ['total_qty', 'qty', 'quantity', 'จำนวน', 'amount', 'total'],
    unit: ['unit', 'หน่วย', 'uom'],

    tmNo: ['transportmanifest_no', 'transportmanifestno', 'tm_no', 'tmno', 'tm', 'เลขที่ใบคุม', 'เลขที่ tm', 'manifresh', 'manifest'],
    controlDate: ['doc_date', 'transportmanifest_date', 'tm_date', 'control_date', 'วันที่ใบคุม', 'วันที่ขนส่ง', 'dateoftm'],

    notes: ['comment', 'tmnotes', 'notes', 'remark', 'หมายเหตุ', 'remarks', 'note']
};

const normalize = (str: string) => str.toLowerCase().replace(/[\s_.-]/g, '');

const getCellText = (cellValue: any): string => {
    if (cellValue && typeof cellValue === 'object' && (cellValue as any).text) {
        return (cellValue as any).text;
    }
    return String(cellValue || '');
};

// --- Parsing Logic ---

const parseExcelFile = async (file: File, existingItems: ReturnRecord[]): Promise<any[]> => {
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error('No worksheet found');

    // 1. Header Detection
    let headerRowIndex = 1;
    let headerFound = false;

    worksheet.eachRow((row, rowNumber) => {
        if (headerFound) return;
        const values = (row.values as any[]).slice(1).map(v => getCellText(v).toLowerCase());
        const joined = values.join(' ');

        let matchCount = 0;
        if (joined.includes('doc') || joined.includes('r no') || joined.includes('เลขที่')) matchCount++;
        if (joined.includes('cust') || joined.includes('ลูกค้า') || joined.includes('sold')) matchCount++;
        if (joined.includes('product') || joined.includes('item') || joined.includes('สินค้า') || joined.includes('sku')) matchCount++;
        if (joined.includes('qty') || joined.includes('จำนวน')) matchCount++;

        if (matchCount >= 1) {
            headerRowIndex = rowNumber;
            headerFound = true;
        }
    });

    const headerMap: Record<number, keyof ReturnRecord> = {};
    const headerRow = worksheet.getRow(headerRowIndex);

    headerRow.eachCell((cell, colNumber) => {
        const cellVal = normalize(getCellText(cell.value));
        for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
            if (aliases.some(a => normalize(a) === cellVal)) {
                headerMap[colNumber] = field as keyof ReturnRecord;
                break;
            }
        }
    });

    if (Object.keys(headerMap).length === 0) {
        throw new Error('ไม่พบหัวตารางที่ถูกต้อง (เช่น Doc No, Product, Qty)');
    }

    // 2. Validation Sets
    const lockedDocNos = new Set(existingItems.filter(i =>
        i.status !== 'Draft' && i.status !== 'Requested'
    ).map(i => (i.documentNo || '').trim().toLowerCase()).filter(Boolean));

    const existingExactKeys = new Set(existingItems.map(i =>
        `${(i.documentNo || '').trim().toLowerCase()}|${(i.productName || '').trim().toLowerCase()}`
    ));

    const currentFileKeys = new Set<string>();
    const parsedItems: any[] = [];

    // 3. Row Parsing
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowIndex) return;

        const newItem: any = {
            documentType: 'LOGISTICS',
            status: 'Draft'
        };
        let hasData = false;

        row.eachCell((cell, colNumber) => {
            const mappedField = headerMap[colNumber];
            if (mappedField) {
                let value = cell.value;
                // Date handling
                if (mappedField === 'date' || mappedField === 'controlDate') {
                    if (value instanceof Date) {
                        value = value.toISOString().split('T')[0];
                    } else if (typeof value === 'object' && (value as any).text) {
                        value = (value as any).text;
                    } else if (typeof value === 'string') {
                        const parts = value.trim().split('/');
                        if (parts.length === 3) value = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                }
                value = getCellText(value);
                if (value) {
                    if (typeof value === 'string') value = value.trim();
                    newItem[mappedField] = value;
                    hasData = true;
                }
            }
        });

        // Auto-assign Branch based on Address/Province (Heuristic)
        if (newItem.customerAddress) {
            const addr = newItem.customerAddress;
            let province = '';
            // Regex to find Province: Matches 'จังหวัด' or 'จ.' followed by text
            const provMatch = addr.match(/(?:จ\.|จังหวัด)\s*([^\s0-9]+)/);
            if (provMatch && provMatch[1]) province = provMatch[1].trim();

            // Regex to find Amphoe: Matches 'อำเภอ' or 'อ.' followed by text
            let amphoe = '';
            const amphoeMatch = addr.match(/(?:อ\.|อำเภอ)\s*([^\s0-9]+)/);
            if (amphoeMatch && amphoeMatch[1]) amphoe = amphoeMatch[1].trim();

            const has = (t: string, k: string) => t.includes(k);
            const hasAny = (t: string, ks: string[]) => ks.some(k => t.includes(k));

            // Helper to check branch mapping
            const checkBranch = (prov: string, amp: string) => {
                if (hasAny(prov, ['ลำปาง', 'เชียงราย', 'แพร่', 'น่าน'])) return 'EKP ลำปาง';
                if (hasAny(prov, ['เชียงใหม่', 'ลำพูน', 'พะเยา', 'แม่ฮ่องสอน'])) return 'เชียงใหม่';
                if (has(prov, 'ตาก') && has(amp, 'แม่สอด')) return 'แม่สอด';
                if (has(prov, 'กำแพงเพชร') || (has(prov, 'ตาก') && !has(amp, 'แม่สอด'))) return 'กำแพงเพชร';
                if (hasAny(prov, ['พิษณุโลก', 'สุโขทัย', 'อุตรดิตถ์']) || (has(prov, 'เพชรบูรณ์') && hasAny(amp, ['หล่มสัก', 'หล่มเก่า']))) return 'พิษณุโลก';
                if (hasAny(prov, ['นครสวรรค์', 'ชัยนาท', 'อุทัยธานี', 'พิจิตร']) || (has(prov, 'เพชรบูรณ์') && !hasAny(amp, ['หล่มสัก', 'หล่มเก่า']))) return 'นครสวรรค์';
                return null;
            };

            // 1. Try with extracted Province/Amphoe
            if (province) {
                const b = checkBranch(province, amphoe);
                if (b) newItem.branch = b;
            }

            // 2. Fallback: If no branch assigned yet, search raw address string for province keywords
            if (!newItem.branch) {
                const rawAddr = addr; // Search in full address
                const nullAmp = ''; // No specific amphoe known for fallback usually, or could try to scan

                // Reuse logic by "simulating" province found if keyword exists
                if (hasAny(rawAddr, ['ลำปาง', 'เชียงราย', 'แพร่', 'น่าน'])) newItem.branch = 'EKP ลำปาง';
                else if (hasAny(rawAddr, ['เชียงใหม่', 'ลำพูน', 'พะเยา', 'แม่ฮ่องสอน'])) newItem.branch = 'เชียงใหม่';
                else if (has(rawAddr, 'แม่สอด')) newItem.branch = 'แม่สอด'; // Specific check for Maesod district name
                else if (has(rawAddr, 'กำแพงเพชร')) newItem.branch = 'กำแพงเพชร';
                else if (has(rawAddr, 'ตาก')) newItem.branch = 'กำแพงเพชร'; // Default Tak to KPP if Maesod not found
                else if (hasAny(rawAddr, ['พิษณุโลก', 'สุโขทัย', 'อุตรดิตถ์'])) newItem.branch = 'พิษณุโลก';
                else if (hasAny(rawAddr, ['นครสวรรค์', 'ชัยนาท', 'อุทัยธานี', 'พิจิตร'])) newItem.branch = 'นครสวรรค์';
                else if (has(rawAddr, 'เพชรบูรณ์')) {
                    if (hasAny(rawAddr, ['หล่มสัก', 'หล่มเก่า'])) newItem.branch = 'พิษณุโลก';
                    else newItem.branch = 'นครสวรรค์';
                }
            }
        }

        if (hasData) {
            // --- Customer Mapping Logic ---
            // 1. Capture what Excel thinks is "Customer Name"
            const rawCustomerName = newItem.customerName;

            // 2. Map it to Destination Customer (as per user request)
            if (rawCustomerName) {
                newItem.destinationCustomer = rawCustomerName;
            }

            // 3. Force Source Customer to be Sino-Pacific
            newItem.customerName = 'บจก.ซีโน-แปซิฟิค เทรดดิ้ง (ประเทศไทย)';

            // 4. Force Date to be Today (Import Date)
            newItem.date = new Date().toISOString().split('T')[0];

            const docNo = (newItem.documentNo || '').trim().toLowerCase();
            const productKey = (newItem.productName || '').trim().toLowerCase();
            const exactKey = `${docNo}|${productKey}`;

            // --- Smarter Duplicate Detection ---
            // Find existing matching item
            const matchingItem = existingItems.find(i => {
                const iDoc = (i.documentNo || '').trim().toLowerCase();
                const iProd = (i.productName || '').trim().toLowerCase();
                // Match Logic: Check DocNo and Product Name OR RefNo
                // Simple exact key match
                return `${iDoc}|${iProd}` === exactKey;
            });

            if (matchingItem) {
                // Check if it should be LOCKED (Step 2+) or UPDATED (Step 1)
                // We define specific statuses that are considered "Locked" (Already in process)
                // Any other status (including undefined, null, Cancelled, Draft, Requested) will be treated as "Updateable"
                const lockedStatuses = new Set([
                    'JobAccepted', 'COL_JobAccepted', 'NCR_JobAccepted',
                    'BranchReceived', 'COL_BranchReceived', 'NCR_BranchReceived',
                    'Consolidated', 'COL_Consolidated',
                    'InTransit', 'COL_InTransit', 'NCR_InTransit',
                    'InTransitToHub', // Legacy
                    'HubReceived', 'COL_HubReceived', 'NCR_HubReceived',
                    'ReceivedAtHub', // Legacy
                    'DocsCompleted', 'COL_Documented',
                    'Completed', 'ReturnToSupplier', 'DirectReturn'
                ]);

                if (matchingItem.status && lockedStatuses.has(matchingItem.status)) {
                    // Locked: Step 2+
                    newItem['__isLocked'] = true;
                } else {
                    // Editable: Step 1 (Draft/Requested) OR Ghost/Broken/Cancelled Item
                    // Allow Update!
                    newItem['__isUpdate'] = true;
                    newItem['id'] = matchingItem.id; // CRITICAL: Carrying ID allows Update
                }
            } else {
                // Check if we are importing duplicates WITHIN the same file
                if (currentFileKeys.has(exactKey)) {
                    newItem['__isDupInFile'] = true; // Mark distinct from DB dup
                }
            }

            if (docNo) currentFileKeys.add(exactKey);
            parsedItems.push(newItem);
        }
    });

    return parsedItems;
};

// --- Main Function ---

export const importExcelWithSwal = async (existingItems: ReturnRecord[]): Promise<Partial<ReturnRecord>[] | null> => {
    // 1. Upload
    const { value: file } = await Swal.fire({
        title: 'Import Excel (Logistics)',
        input: 'file',
        inputAttributes: {
            'accept': '.xlsx, .xls, .csv',
            'aria-label': 'Upload Excel File'
        },
        html: `
            <div class="text-sm text-slate-500 mb-2">อัปโหลดไฟล์ที่มีรายการสินค้า (รองรับไฟล์ .xlsx)</div>
        `,
        confirmButtonText: 'ตรวจสอบ (Next)',
        showCancelButton: true,
        cancelButtonText: 'ยกเลิก',
        showLoaderOnConfirm: true,
        preConfirm: async (file) => {
            if (!file) {
                Swal.showValidationMessage('กรุณาเลือกไฟล์');
                return false;
            }
            try {
                return await parseExcelFile(file, existingItems);
            } catch (error) {
                Swal.showValidationMessage(`Error: ${error}`);
                return false;
            }
        }
    });

    if (!file) return null; // Cancelled or Error

    let items = file as any[];
    if (items.length === 0) {
        Swal.fire('ไม่พบรายการ', 'ไฟล์ไม่มีข้อมูลสินค้า', 'warning');
        return null;
    }

    // Initialize UI State
    items.forEach((i: any) => {
        if (i.__selected === undefined) {
            // Select if it's NOT Locked and NOT a File Duplicate
            // (Updates are Selected by default)
            i.__selected = !i.__isLocked && !i.__isDupInFile;
        }
    });

    // --- New: Pre-Check for Hard Conflicts (Locked or File Duplicates) ---
    // Note: We do NOT count 'Updates' (existing Drafts) as conflicts here, we let them proceed to the table
    const hardConflictItems = items.filter((i: any) => i.__isDupInFile || i.__isLocked);
    const conflictCount = hardConflictItems.length;

    if (conflictCount > 0) {
        // Summarize for user visibility
        const uniqueConflictedDocs = Array.from(new Set(hardConflictItems.map((i: any) => i.documentNo))).slice(0, 10);
        const moreCount = new Set(hardConflictItems.map((i: any) => i.documentNo)).size - uniqueConflictedDocs.length;
        const docSummary = uniqueConflictedDocs.join(', ') + (moreCount > 0 ? ` ...and ${moreCount} more` : '');

        // Analyze Conflict Types
        const systemConflicts = hardConflictItems.filter((i: any) => i.__isLocked).length;
        const fileDuplicates = hardConflictItems.filter((i: any) => i.__isDupInFile).length;

        let reasonHtml = '';
        if (systemConflicts > 0) reasonHtml += `<p class="text-xs text-slate-500">• <b>${systemConflicts}</b> รายการ: ติดสถานะล็อคในระบบ (รับของแล้ว/จบงานแล้ว)</p>`;
        if (fileDuplicates > 0) reasonHtml += `<p class="text-xs text-slate-500">• <b>${fileDuplicates}</b> รายการ: ซ้ำกันเองในไฟล์ Excel (เลขเอกสาร + สินค้า เหมือนกัน)</p>`;

        const { isConfirmed, isDenied } = await Swal.fire({
            title: 'พบรายการซ้ำ/ติดสถานะ (Conflicts)',
            html: `
                <div class="text-left text-sm">
                    <p class="mb-2 text-red-600 font-bold">ระบบพบรายการที่ต้องตรวจสอบ ${conflictCount} รายการ</p>
                    <div class="bg-slate-100 p-2 rounded border border-slate-300 mb-2 text-xs text-slate-600 font-mono">
                        <b>Documents:</b> ${docSummary || 'N/A'}
                    </div>
                    <div class="mb-3 pl-2 border-l-2 border-red-200">
                        ${reasonHtml}
                    </div>
                    <p class="mb-1">หากต้องการ <b>"นำเข้าใหม่/แก้ไข"</b> (Force Import) ให้เลือก <b>"เขียนทับ/อัปเดต"</b></p>
                    <p class="text-xs text-slate-400">ระบบจะทำการปลดล็อคและบันทึกข้อมูลทับลงไป</p>
                </div>
            `,
            icon: 'warning',
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonColor: '#3b82f6', // Blue for Update
            denyButtonColor: '#f43f5e',   // Red for Remove
            cancelButtonColor: '#64748b',
            confirmButtonText: 'เขียนทับ/อัปเดต (Force Update)',
            denyButtonText: 'ลบรายการนี้ออก (Remove)',
            cancelButtonText: 'ยกเลิก'
        });

        if (isConfirmed) {
            // FORCE UPDATE MODE
            items.forEach((item: any) => {
                if (item.__isLocked || item.__isDupInFile) {
                    // Try to find existing ID to enable Update mode
                    if (!item.id) {
                        const docNo = (item.documentNo || '').trim().toLowerCase();
                        const prod = (item.productName || '').trim().toLowerCase();
                        const match = existingItems.find(ex =>
                            (ex.documentNo || '').trim().toLowerCase() === docNo &&
                            (ex.productName || '').trim().toLowerCase() === prod
                        );
                        if (match) item.id = match.id;
                    }

                    // Convert to Update
                    item.__isLocked = false;
                    item.__isDupInFile = false;
                    item.__isUpdate = true;
                    item.__selected = true; // Auto-select for convenience
                }
            });
            Swal.fire({
                icon: 'success',
                title: 'ปลดล็อคเรียบร้อย',
                text: 'รายการถูกเปลี่ยนสถานะเป็น "อัปเดต"',
                timer: 1000,
                showConfirmButton: false
            });
        } else if (isDenied) {
            // REMOVE MODE (Original Behavior)
            items = items.filter((i: any) => !i.__isDupInFile && !i.__isLocked);
            if (items.length === 0) {
                Swal.fire('ไม่เหลือรายการสินค้า', 'รายการทั้งหมดถูกลบออก', 'info');
                return null;
            }
        } else {
            // Cancel Import
            return null;
        }
    }

    // 2. Preview & Branch Selection
    let confirmedData: Partial<ReturnRecord>[] | null = null;
    let keepOpen = true;

    while (keepOpen) {
        const rowsHtml = items.map((item, idx) => {
            const isLocked = item.__isLocked;
            const isDupInFile = item.__isDupInFile;
            const isUpdate = item.__isUpdate;

            let bgColor = '#ffffff';
            let statusBadge = '';

            if (isLocked) {
                bgColor = '#f3f4f6';
                statusBadge = '<span style="font-size:0.75em; background:#4b5563; color:white; padding:2px 6px; border-radius:4px; font-weight:bold;">Locked Step 2+</span>';
            } else if (isDupInFile) {
                bgColor = '#fff1f2';
                statusBadge = '<span style="font-size:0.75em; background:#f43f5e; color:white; padding:2px 6px; border-radius:4px; font-weight:bold;">Duplicate In File</span>';
            } else if (isUpdate) {
                bgColor = '#eff6ff'; // Blue tint indicating update
                statusBadge = '<span style="font-size:0.75em; background:#3b82f6; color:white; padding:2px 6px; border-radius:4px; font-weight:bold;">Update Existing</span>';
            }

            const branchOpts = BRANCH_LIST.map(b =>
                `<option value="${b}" ${b === item.branch ? 'selected' : ''}>${b}</option>`
            ).join('');

            return `
                <tr style="background-color: ${bgColor}; border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px; text-align:center;">
                        <input type="checkbox" class="row-checkbox" data-index="${idx}" ${item.__selected ? 'checked' : ''} ${isLocked ? 'disabled' : ''} style="transform: scale(1.2);">
                    </td>
                    <td style="padding: 8px;">
                        <select class="swal2-select row-branch" data-index="${idx}" style="margin:0; width:100%; font-size:0.9em; padding: 6px; border-color:#cbd5e1;" ${isLocked ? 'disabled' : ''}>
                            <option value="">- เลือก -</option>
                            ${branchOpts}
                        </select>
                    </td>
                    <td style="padding: 8px; font-size: 0.9em; color:#334155;">
                        <div style="font-weight:bold; color:#1e293b;">${item.documentNo || '-'}</div>
                        ${statusBadge}
                    </td>
                     <td style="padding: 8px; font-size: 0.9em; color:#334155;">${item.destinationCustomer || '-'}</td>
                     <td style="padding: 8px; font-size: 0.9em; color:#334155;">${item.customerAddress || '-'}</td>
                     <td style="padding: 8px; font-size: 0.9em; color:#334155;">${item.productName || '-'}</td>
                     <td style="padding: 8px; font-size: 0.9em; text-align:right; font-weight:bold; color:#0f172a;">${item.quantity} ${item.unit || ''}</td>
                </tr>
            `;
        }).join('');

        const { isConfirmed, isDismissed, value, dismiss } = await Swal.fire({
            title: `ตรวจสอบรายการสินค้า (${items.length})`,
            width: '1000px',
            html: `
                <div style="text-align:left;">
                    <div style="margin-bottom:15px; padding:15px; background:#f0f9ff; border-radius:8px; display:flex; align-items:center; gap:15px; border:1px solid #bae6fd;">
                         <label style="font-weight:bold; font-size:0.95em; color:#0369a1;">📍 กำหนดสาขาทั้งหมด (Batch):</label>
                         <select id="swal-batch-branch" class="swal2-select" style="margin:0; width:220px; font-size:0.95em; padding:8px; border-color:#7dd3fc;">
                            <option value="">-- เลือกสาขา --</option>
                            ${BRANCH_LIST.map(b => `<option value="${b}">${b}</option>`).join('')}
                         </select>
                         <span style="font-size:0.85em; color:#0c4a6e;">(เลือกเพื่อเปลี่ยนสาขาของทุกรายการ)</span>
                    </div>
                     <div style="margin-bottom: 10px; display: flex; justify-content: flex-end;">
                         <button type="button" id="btn-remove-dups" style="font-size: 0.8em; padding: 6px 12px; border: 1px solid #f43f5e; color: #f43f5e; background: #fff1f2; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 5px; font-weight: bold;">
                             <span style="font-size: 1.2em;">🗑️</span> ลบรายการที่มีปัญหา (Remove Conflicts)
                        </button>
                    </div>
                    <div style="max-height: 450px; overflow-y: auto; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);">
                        <table style="width:100%; border-collapse: collapse;">
                            <thead style="background: #f8fafc; position: sticky; top: 0; z-index:10; shadow: 0 1px 2px rgba(0,0,0,0.1);">
                                <tr>
                                    <th style="padding:10px; width:50px; text-align:center;">✓</th>
                                    <th style="padding:10px; width:180px; text-align:left;">สาขา (Branch)</th>
                                    <th style="padding:10px; text-align:left;">เลขที่เอกสาร (R No)</th>
                                    <th style="padding:10px; text-align:left;">ลูกค้า</th>
                                    <th style="padding:10px; text-align:left;">ที่อยู่ (Address)</th>
                                    <th style="padding:10px; text-align:left;">สินค้า</th>
                                    <th style="padding:10px; width:100px; text-align:right;">จำนวน</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                    <div style="margin-top:15px; font-size:0.85em; color:#64748b; display:flex; gap:15px; justify-content:flex-end;">
                        <span style="display:flex; items-center; gap:4px;"><span style="width:12px; height:12px; background:#4b5563; border-radius:2px; display:inline-block;"></span> Locked (ห้ามแก้ไข)</span>
                        <span style="display:flex; items-center; gap:4px;"><span style="width:12px; height:12px; background:#f43f5e; border-radius:2px; display:inline-block;"></span> Duplicate (ซ้ำ)</span>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'ยืนยันการนำเข้า (Confirm Import)',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#10b981',
            focusConfirm: false,
            didOpen: () => {
                const batchSelect = document.getElementById('swal-batch-branch') as HTMLSelectElement;
                const removeDupBtn = document.getElementById('btn-remove-dups');

                if (removeDupBtn) {
                    removeDupBtn.addEventListener('click', () => {
                        Swal.getPopup()?.setAttribute('data-action', 'remove_dups');
                        Swal.clickConfirm();
                    });
                }

                if (batchSelect) {
                    batchSelect.addEventListener('change', (e) => {
                        const val = (e.target as HTMLSelectElement).value;
                        const rowSelects = document.querySelectorAll('.row-branch');
                        rowSelects.forEach(sel => {
                            if (!(sel as HTMLSelectElement).disabled) {
                                (sel as HTMLSelectElement).value = val;
                            }
                        });
                    });
                }
            },
            preConfirm: () => {
                const action = Swal.getPopup()?.getAttribute('data-action');
                if (action === 'remove_dups') {
                    return 'REMOVE_CONFLICTS';
                }

                const rowSelects = document.querySelectorAll('.row-branch');
                const rowChecks = document.querySelectorAll('.row-checkbox');

                const selectedItems: Partial<ReturnRecord>[] = [];
                const missingBranchItems: any[] = [];

                items.forEach((item, i) => {
                    const check = rowChecks[i] as HTMLInputElement;
                    const branchVal = (rowSelects[i] as HTMLSelectElement).value;

                    // State Persistence
                    item.branch = branchVal;
                    item.__selected = check.checked;

                    if (!check.checked) return;

                    if (!branchVal && !item.__isLocked) {
                        missingBranchItems.push(item);
                    }

                    const { __isLocked, __isDup, __isDupInFile, __isUpdate, __selected, ...cleanItem } = item;
                    cleanItem.branch = branchVal;
                    selectedItems.push(cleanItem);
                });

                if (missingBranchItems.length > 0) {
                    return { action: 'MISSING_BRANCH', items: missingBranchItems };
                }

                if (selectedItems.length === 0) {
                    Swal.showValidationMessage('กรุณาเลือกรายการอย่างน้อย 1 รายการ');
                    return false;
                }

                return selectedItems;
            }
        });

        if (isDismissed) {
            if (dismiss === Swal.DismissReason.cancel) {
                keepOpen = false;
                return null;
            }
            if (value !== 'REMOVE_CONFLICTS') {
                keepOpen = false;
                return null;
            }
        }

        if (value === 'REMOVE_CONFLICTS') {
            // Filter conflicts and update state
            items = items.filter((i: any) => !i.__isDup && !i.__isLocked);
            // Re-init selected state for remaining items to be sure
            items.forEach((i: any) => {
                if (i.__selected === undefined) i.__selected = true;
            });
            continue;
        }

        // Handle Validations Returns
        if (value && value.action === 'MISSING_BRANCH') {
            const missingList = value.items;
            const { value: updatedItems } = await Swal.fire({
                title: 'กรุณาระบุข้อมูลให้ครบถ้วน',
                width: '1200px',
                html: `
                    <div class="text-left text-sm">
                        <p class="mb-2 text-red-600 font-bold">พบรายการที่ยังไม่ได้ระบุสาขาหรือข้อมูลไม่ครบถ้วนจำนวน ${missingList.length} รายการ:</p>
                        
                        <div style="margin-bottom:15px; padding:10px; background:#f0f9ff; border-radius:6px; display:flex; align-items:center; gap:10px; border:1px solid #bae6fd;">
                             <label style="font-weight:bold; font-size:0.9em; color:#0369a1;">📍 กำหนดสาขาทั้งหมด (Batch):</label>
                             <select id="swal-missing-batch-branch" class="swal2-select" style="margin:0; width:200px; font-size:0.9em; padding:6px; border-color:#7dd3fc; height: 36px;">
                                <option value="">-- เลือกสาขา --</option>
                                ${BRANCH_LIST.map(b => `<option value="${b}">${b}</option>`).join('')}
                             </select>
                        </div>

                        <div style="max-height: 400px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px;">
                            <table style="width:100%; border-collapse: separate; border-spacing: 0; font-size:0.85em;">
                                <thead class="bg-slate-100 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th class="p-2 text-left font-semibold text-slate-700 bg-slate-100 border-b">Doc No</th>
                                        <th class="p-2 text-left font-semibold text-slate-700 bg-slate-100 border-b" style="min-width: 150px;">ระบุสาขา (Branch) <span class="text-red-500">*</span></th>
                                        <th class="p-2 text-left font-semibold text-slate-700 bg-slate-100 border-b" style="min-width: 180px;">ลูกค้า (Customer)</th>
                                        <th class="p-2 text-left font-semibold text-slate-700 bg-slate-100 border-b" style="min-width: 200px;">ที่อยู่ (Address)</th>
                                        <th class="p-2 text-left font-semibold text-slate-700 bg-slate-100 border-b">Product</th>
                                        <th class="p-2 text-right font-semibold text-slate-700 bg-slate-100 border-b">Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${missingList.map((m: any, idx: number) => `
                                        <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td class="p-2 align-top text-slate-600 font-mono">${m.documentNo || '-'}</td>
                                            <td class="p-2 align-top">
                                                <select class="swal-fix-input-branch w-full p-1 border border-slate-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" data-idx="${idx}">
                                                    <option value="">-- เลือก --</option>
                                                    ${BRANCH_LIST.map(b => `<option value="${b}" ${b === m.branch ? 'selected' : ''}>${b}</option>`).join('')}
                                                </select>
                                            </td>
                                            <td class="p-2 align-top text-slate-600">
                                                ${m.destinationCustomer || '-'}
                                            </td>
                                            <td class="p-2 align-top text-slate-600">
                                                ${m.customerAddress || '-'}
                                            </td>
                                            <td class="p-2 align-top text-slate-700">${m.productName || '-'}</td>
                                            <td class="p-2 align-top text-right font-bold text-slate-700">${m.quantity}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'บันทึกและตรวจสอบต่อ',
                cancelButtonText: 'ยกเลิก',
                confirmButtonColor: '#3b82f6',
                focusConfirm: false,
                didOpen: () => {
                    const batchSelect = document.getElementById('swal-missing-batch-branch') as HTMLSelectElement;
                    if (batchSelect) {
                        batchSelect.addEventListener('change', (e) => {
                            const val = (e.target as HTMLSelectElement).value;
                            const rowSelects = document.querySelectorAll('.swal-fix-input-branch');
                            rowSelects.forEach(sel => {
                                (sel as HTMLSelectElement).value = val;
                            });
                        });
                    }
                },
                preConfirm: () => {
                    const branches = document.querySelectorAll('.swal-fix-input-branch');

                    const updates: any[] = [];
                    let hasError = false;

                    branches.forEach((el, i) => {
                        const branchVal = (el as HTMLSelectElement).value;
                        if (!branchVal) {
                            el.classList.add('border-red-500', 'bg-red-50');
                            hasError = true;
                        } else {
                            el.classList.remove('border-red-500', 'bg-red-50');
                        }

                        updates.push({
                            branch: branchVal,
                            destinationCustomer: missingList[i].destinationCustomer,
                            customerAddress: missingList[i].customerAddress
                        });
                    });

                    if (hasError) {
                        Swal.showValidationMessage('กรุณาระบุสาขาให้ครบทุกรายการ');
                        return false;
                    }

                    return updates;
                }
            });

            if (updatedItems) {
                updatedItems.forEach((update: any, i: number) => {
                    const item = missingList[i];
                    if (item) {
                        item.branch = update.branch;
                        item.destinationCustomer = update.destinationCustomer;
                        item.customerAddress = update.customerAddress;
                    }
                });
            }

            continue; // Re-open main modal with preserved state
        }

        // 4. Success Case (Standard Return)
        if (value && Array.isArray(value)) {
            confirmedData = value;
            keepOpen = false;
        }
    }

    if (confirmedData) {
        Swal.fire({
            icon: 'success',
            title: 'นำเข้าสำเร็จ',
            text: `นำเข้าข้อมูล ${confirmedData.length} รายการ`,
            timer: 1500,
            showConfirmButton: false
        });
        return confirmedData;
    }

    return null;
};
