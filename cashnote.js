/*
 * Cashnote Coupon Extractor (Bookmarklet)
 * Target: https://market.cashnote.kr/orders
 * Features: 
 *  1. Supports Pagination using lastOrderId
 *  2. Filters: 신세계이마트, 이마트, 문화상품권
 *  3. Sorts: Unused coupons (claimStatus: NONE) first
 *  4. UI: Black background, green text log window (100% width, 200px height)
 */

// ==========================================
// 1. 상세 주석 버전 (Readable Version)
// ==========================================
async function extractCashnoteCoupons() {
    // UI 생성: 상단 고정, 검정 배경, 녹색 글씨
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:200px; z-index:99999; background:#000; border-bottom:2px solid #0f0; overflow:hidden; font-family:monospace;';
    
    const textarea = document.createElement('textarea');
    textarea.style.cssText = 'width:100%; height:100%; background:transparent; color:#0f0; border:none; padding:10px; font-size:12px; outline:none; resize:none;';
    textarea.value = 'Starting extraction from Cashnote Market...\n';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerText = '✕ CLOSE';
    closeBtn.style.cssText = 'position:absolute; right:10px; top:10px; background:#0f0; color:#000; border:none; padding:4px 8px; cursor:pointer; font-size:10px; font-weight:bold;';
    closeBtn.onclick = () => container.remove();
    
    container.appendChild(textarea);
    container.appendChild(closeBtn);
    document.body.appendChild(container);

    const log = (msg) => {
        textarea.value += msg + '\n';
        textarea.scrollTop = textarea.scrollHeight;
    };

    // 타겟 키워드 및 토큰 설정
    const targetKeywords = ['신세계이마트', '이마트', '문화상품권'];
    const token = localStorage.getItem('X-Client-Auth-Token') || 'REMOVED_TOKEN';

    let allCoupons = [];
    let lastOrderId = null;
    let hasMore = true;
    let page = 1;

    try {
        while (hasMore) {
            log(`Fetching data (Page ${page})...`);
            // lastOrderId가 있으면 쿼리 스트링에 추가 (제공된 curl 패턴 반영)
            const url = `https://market-api.cashnote.kr/api/market-place/v1/orders${lastOrderId ? '?lastOrderId=' + lastOrderId : ''}`;
            
            const res = await fetch(url, {
                headers: {
                    "Accept": "*/*",
                    "X-Client-Auth-Token": token,
                    "X-Market-Front-Page": "https://market.cashnote.kr/orders"
                }
            });

            if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
            
            const data = await res.json();
            const content = data.content || [];

            if (content.length === 0) break;

            // 데이터 가공
            content.forEach(order => {
                order.productOrders.forEach(po => {
                    const matched = targetKeywords.find(k => po.productName.includes(k));
                    if (matched) {
                        allCoupons.push({
                            category: matched,
                            name: po.productName,
                            number: po.eCouponNumber || 'N/A',
                            status: po.claimStatus === 'NONE' ? '미사용' : '사용완료/취소',
                            isUnused: po.claimStatus === 'NONE'
                        });
                    }
                });
            });

            // 다음 페이지를 위한 ID 업데이트
            hasMore = data.hasNextPage;
            lastOrderId = data.lastId; 
            page++;

            // 과도한 호출 방지 (최대 30페이지)
            if (page > 30) break;
        }

        // 결과 정렬: 미사용(isUnused: true) 항목을 최상단으로
        allCoupons.sort((a, b) => (b.isUnused - a.isUnused));

        log('\n=== 쿠폰 추출 결과 (미사용 우선) ===\n');
        
        const grouped = {};
        allCoupons.forEach(c => {
            if (!grouped[c.category]) grouped[c.category] = [];
            grouped[c.category].push(c);
        });

        let output = "";
        targetKeywords.forEach(k => {
            if (grouped[k]) {
                output += `[${k}]\n`;
                grouped[k].forEach(c => {
                    output += `${c.isUnused ? '✅' : '➖'} ${c.number} | ${c.name}\n`;
                });
                output += '\n';
            }
        });

        log(output || "조건에 맞는 쿠폰을 찾지 못했습니다.");

    } catch (err) {
        log(`Error: ${err.message}`);
    }
}

// ==========================================
// 2. 북마클릿용 압축 버전 (Minified Version)
// ==========================================
// 복사하여 북마크 URL에 입력하세요:
// javascript:(async function(){const e=document.createElement("div");e.style.cssText="position:fixed;top:0;left:0;width:100%;height:200px;z-index:99999;background:#000;border-bottom:2px solid #0f0;overflow:hidden;font-family:monospace;";const t=document.createElement("textarea");t.style.cssText="width:100%;height:100%;background:transparent;color:#0f0;border:none;padding:10px;font-size:12px;outline:none;resize:none;";t.value="Starting...\n";const n=document.createElement("button");n.innerText="✕ CLOSE";n.style.cssText="position:absolute;right:10px;top:10px;background:#0f0;color:#000;border:none;padding:4px 8px;cursor:pointer;font-size:10px;font-weight:bold;";n.onclick=()=>e.remove();e.appendChild(t);e.appendChild(n);document.body.appendChild(e);const o=e=>{t.value+=e+"\n";t.scrollTop=t.scrollHeight};const r=["신세계이마트","이마트","문화상품권"],c=localStorage.getItem("X-Client-Auth-Token")||"REMOVED_TOKEN";let a=[],i=null,l=!0,s=1;try{while(l){o(`Page ${s}...`);const e=await fetch(`https://market-api.cashnote.kr/api/market-place/v1/orders${i?"?lastOrderId="+i:""}`,{headers:{"X-Client-Auth-Token":c,"X-Market-Front-Page":"https://market.cashnote.kr/orders"}});if(!e.ok)break;const t=await e.json(),n=t.content||[];if(0===n.length)break;n.forEach(e=>{e.productOrders.forEach(e=>{const t=r.find(t=>e.productName.includes(t));t&&a.push({cat:t,name:e.productName,num:e.eCouponNumber,u:"NONE"===e.claimStatus})})});l=t.hasNextPage;i=t.lastId;s++;if(s>30)break}a.sort((e,t)=>t.u-e.u);let e="";r.forEach(t=>{const n=a.filter(e=>e.cat===t);n.length&&(e+=`[${t}]\n`,n.forEach(t=>{e+=`${t.u?"✅":"➖"} ${t.num} | ${t.name}\n`}),e+="\n")});o("\n=== RESULT ===\n");o(e||"No results.")}catch(e){o("Error:"+e.message)}})();
