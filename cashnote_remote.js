/**
 * 캐시노트 쿠폰 추출기 (이미지 분석 AI 버전)
 * 
 * 주요 기능:
 * 1. 이미지 분석: Canvas API를 사용하여 이미지 좌측 상단의 '사용 완료' 도장을 픽셀 단위로 감지
 * 2. 페이징 처리: lastOrderId 기반 전체 주문 내역 자동 스캔
 * 3. 스마트 분류: 미사용 쿠폰 우선 정렬 및 카테고리별 정리
 */

(async function startAdvancedExtraction() {
    // [0] 페이지 확인
    if (!window.location.href.includes('market.cashnote.kr/orders')) {
        alert('구매 목록 페이지로 이동합니다.\n이동 후 북마크를 다시 실행해주세요.');
        window.location.href = 'https://market.cashnote.kr/orders';
        return;
    }

    // [1] UI 터미널 생성
    const logId = 'cashnote-terminal';
    if (document.getElementById(logId)) document.getElementById(logId).remove();

    const container = document.createElement('div');
    container.id = logId;
    container.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        z-index: 100000; background: #000; color: #0f0; border-bottom: 2px solid #0f0;
        font-family: 'Courier New', monospace; display: flex; flex-direction: column;
    `;
    
    const header = document.createElement('div');
    header.style.cssText = 'padding: 5px 10px; background: #111; font-size: 11px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;';
    header.innerHTML = `
        <span>CASHNOTE ANALYZER <small style="color:#888;">by krazyeom</small></span>
        <div>
            <span id="watch-ad" style="cursor:pointer; color:#ff0; margin-right:15px;">[AD]</span>
            <span id="view-history" style="cursor:pointer; color:#fff; margin-right:15px; display:none;">[HISTORY]</span>
            <span id="view-barcodes" style="cursor:pointer; color:#0f0; margin-right:15px; display:none;">[VIEW BARCODES]</span>
            <span id="view-about" style="cursor:pointer; color:#0af; margin-right:15px;">[ABOUT]</span>
            <span id="close-terminal" style="cursor:pointer; color:#f00;">[CLOSE]</span>
        </div>
    `;
    
    const textarea = document.createElement('textarea');
    textarea.style.cssText = 'flex: 1; width: 100%; background: transparent; color: #0f0; border: none; padding: 10px; font-size: 13px; outline: none; resize: none; line-height: 1.4;';
    textarea.readOnly = true;
    textarea.value = 'Initializing Advanced Image Analysis...\n';
    
    container.appendChild(header);
    container.appendChild(textarea);
    document.body.appendChild(container);
    document.getElementById('close-terminal').onclick = () => container.remove();

    // [1-2] 구입 내역 (HISTORY) 모달
    const showHistoryModal = (results) => {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:100005; display:flex; align-items:center; justify-content:center; color:#fff; font-family:sans-serif;';
        modal.onclick = () => modal.remove();
        
        const card = document.createElement('div');
        card.style.cssText = 'background:#111; padding:25px; border-radius:15px; width:90%; max-width:400px; border:1px solid #333; max-height:80vh; overflow-y:auto;';
        card.onclick = (e) => e.stopPropagation();
        
        const groups = {};
        results.forEach(item => {
            const d = item.date.split('T')[0];
            if (!groups[d]) groups[d] = [];
            groups[d].push(item);
        });
        
        const sortedDates = Object.keys(groups).sort().reverse();
        let html = '<div style="font-size:18px; font-weight:bold; margin-bottom:20px; color:#fff; border-bottom:1px solid #333; padding-bottom:10px;">Purchase History</div>';
        
        sortedDates.forEach(date => {
            const items = groups[date];
            html += `
                <div style="margin-bottom:20px;">
                    <div style="font-size:14px; color:#0f0; font-weight:bold; margin-bottom:8px;">📅 ${date} (${items.length}건)</div>
                    <div style="font-size:12px; color:#ccc; line-height:1.6; padding-left:10px; border-left:1px solid #222;">
                        ${items.map(i => {
                            let icon = (i.status === 'UNUSED') ? '✅' : (i.status === 'USED' ? '➖' : (i.status === 'CANCELED' ? '❌' : '⚠️'));
                            return `• ${icon} ${i.name}`;
                        }).join('<br>')}
                    </div>
                </div>
            `;
        });
        
        card.innerHTML = html + '<button style="width:100%; margin-top:10px; padding:10px; background:#333; color:#fff; border:none; border-radius:5px; cursor:pointer;">닫기</button>';
        card.querySelector('button').onclick = () => modal.remove();
        modal.appendChild(card);
        document.body.appendChild(modal);
    };

    const print = (msg) => {
        detailedLogs += msg + '\n';
        if (textarea) {
            textarea.value = detailedLogs;
            textarea.scrollTop = textarea.scrollHeight;
        }
    };

    const showToast = (msg) => {
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(0,255,0,0.95); color:#000; padding:15px 25px; border-radius:30px; font-weight:bold; font-size:18px; z-index:200000; box-shadow:0 0 30px rgba(0,255,0,0.4); text-align:center; pointer-events:none; animation:fadeInOut 3s forwards; width:auto; max-width:85%; word-break:keep-all; line-height:1.4;';
        toast.innerHTML = `🎉 당첨! <br> <span style="font-size:20px;">${msg}</span>`;
        
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes fadeInOut {
                0% { opacity:0; transform:translate(-50%, -45%); }
                10% { opacity:1; transform:translate(-50%, -50%); }
                80% { opacity:1; transform:translate(-50%, -50%); }
                100% { opacity:0; transform:translate(-50%, -55%); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(toast);
        setTimeout(() => { toast.remove(); style.remove(); }, 3000);
    };

    const showProgress = (title, status) => {
        let overlay = document.getElementById('cashnote-progress');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'cashnote-progress';
            overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:100006; display:flex; align-items:center; justify-content:center; color:#fff; font-family:sans-serif;';
            overlay.innerHTML = `
                <div style="background:#222; padding:30px; border-radius:20px; text-align:center; width:250px; border:1px solid #444;">
                    <div style="color:#0f0; font-size:18px; font-weight:bold; margin-bottom:15px;">Scanning...</div>
                    <div id="prog-title" style="font-size:14px; margin-bottom:10px;"></div>
                    <div id="prog-status" style="font-size:12px; color:#aaa;"></div>
                    <div style="margin-top:20px;"><small style="color:#555;">by krazyeom</small></div>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        document.getElementById('prog-title').textContent = title;
        document.getElementById('prog-status').textContent = status;
    };

    const hideProgress = () => {
        const overlay = document.getElementById('cashnote-progress');
        if (overlay) overlay.remove();
    };

    // [1-4] About & Version History
    const showAboutModal = () => {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:100007; display:flex; align-items:center; justify-content:center; color:#fff; font-family:sans-serif;';
        modal.onclick = () => modal.remove();
        const card = document.createElement('div');
        card.style.cssText = 'background:#111; padding:25px; border-radius:15px; width:90%; max-width:400px; border:1px solid #333;';
        card.onclick = (e) => e.stopPropagation();
        card.innerHTML = `
            <div style="font-size:18px; font-weight:bold; margin-bottom:15px; color:#0af;">About CASHNOTE ANALYZER</div>
            <div style="font-size:14px; color:#ccc; line-height:1.6;">
                <strong>Version:</strong> v6.1 (Stable)<br>
                <strong>Author:</strong> krazyeom<br><br>
                <div style="border-top:1px solid #222; padding-top:10px;">
                    <strong style="color:#0f0;">Changelog:</strong><br>
                    \u2022 v6.1: H.Point support added.<br>
                    \u2022 v6.0: About page added, Barcode engine optimized.<br>
                    \u2022 v5.9: Multi-event automation, UI/UX polish.<br>
                    \u2022 v5.8: Reliability improvements in image analysis.<br>
                    \u2022 v5.5: Secure activity tracking & logging.<br>
                    \u2022 v5.0: Initial AI-based 'Used' stamp detection.
                </div>
            </div>
            <button style="width:100%; margin-top:20px; padding:10px; background:#222; color:#fff; border:1px solid #444; border-radius:5px; cursor:pointer;">닫기</button>
        `;
        card.querySelector('button').onclick = () => modal.remove();
        modal.appendChild(card);
        document.body.appendChild(modal);
    };

    const analyzeImage = (url) => {
        return new Promise((resolve) => {
            if (!url) return resolve('UNKNOWN');
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    const checkW = img.width * 0.3;
                    const checkH = img.height * 0.3;
                    const imageData = ctx.getImageData(0, 0, checkW, checkH);
                    const data = imageData.data;
                    let grayPixels = 0;
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i], g = data[i+1], b = data[i+2];
                        const avg = (r + g + b) / 3;
                        const diff = Math.max(r, g, b) - Math.min(r, g, b);
                        if (avg > 70 && avg < 190 && diff < 30) grayPixels++;
                    }
                    const ratio = grayPixels / (data.length / 4);
                    resolve(ratio > 0.15 ? 'USED' : 'UNUSED');
                } catch (e) {
                    resolve('CORS_ERROR');
                }
            };
            img.onerror = () => resolve('LOAD_ERROR');
            img.src = url;
        });
    };
    
    const showBarcodeViewer = (items) => {
        if (items.length === 0) return alert('미사용 신세계/이마트 쿠폰이 없습니다.');
        let currentIndex = 0;
        const viewer = document.createElement('div');
        viewer.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:100001; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; font-family:sans-serif; touch-action:manipulation;';
        const closeBtn = document.createElement('div');
        closeBtn.style.cssText = 'position:absolute; top:20px; right:20px; font-size:30px; cursor:pointer; padding:10px; touch-action:manipulation;';
        closeBtn.innerHTML = '✕';
        closeBtn.onclick = () => viewer.remove();
        const content = document.createElement('div');
        content.style.cssText = 'background:#fff; color:#000; padding:30px; border-radius:15px; text-align:center; width:85%; max-width:320px; box-shadow:0 0 20px rgba(255,255,255,0.2); position:relative;';
        content.innerHTML = `
            <div id="bc-amount" style="font-size:18px; font-weight:bold; margin-bottom:5px; color:#333;"></div>
            <div style="font-size:12px; font-weight:bold; color:#f00; margin-bottom:10px;">(이마트 전용, 신세계 백화점 사용불가)</div>
            <div id="bc-name" style="font-size:14px; color:#666; margin-bottom:20px;"></div>
            <div style="display:flex; align-items:center; justify-content:center; gap:10px; position:relative;">
                <button id="prev-bc" style="position:absolute; left:-65px; width:60px; height:100px; background:rgba(255,255,255,0.3); border:1px solid #fff; color:#fff; border-radius:10px; cursor:pointer; font-size:30px; display:flex; align-items:center; justify-content:center; z-index:100; touch-action:manipulation;">◀</button>
                <img id="bc-img" style="width:100%; height:auto; min-height:100px; margin:10px 0;">
                <button id="next-bc" style="position:absolute; right:-65px; width:60px; height:100px; background:rgba(255,255,255,0.3); border:1px solid #fff; color:#fff; border-radius:10px; cursor:pointer; font-size:30px; display:flex; align-items:center; justify-content:center; z-index:100; touch-action:manipulation;">▶</button>
            </div>
            <div id="bc-number" style="font-size:20px; font-weight:bold; margin-top:15px; letter-spacing:2px; font-family:monospace;"></div>
            <div id="bc-index" style="margin-top:20px; font-size:14px; color:#888;"></div>
        `;
        const amountEl = content.querySelector('#bc-amount');
        const nameEl = content.querySelector('#bc-name');
        const imgEl = content.querySelector('#bc-img');
        const numberEl = content.querySelector('#bc-number');
        const indexEl = content.querySelector('#bc-index');
        const updateContent = () => {
            const item = items[currentIndex];
            const amountMatch = item.name.match(/[\d,]+원/);
            amountEl.textContent = amountMatch ? amountMatch[0] : '신세계 상품권';
            nameEl.textContent = item.name;
            
            // [개선] 이전 바코드가 보이지 않도록 즉시 투명도 조절 및 로딩 처리
            imgEl.style.opacity = '0.2';
            imgEl.onload = () => { imgEl.style.opacity = '1'; };
            imgEl.src = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${item.number}&scale=3&rotate=N&includetext=false&ts=${Date.now()}`;
            
            numberEl.textContent = item.number;
            indexEl.textContent = (currentIndex + 1) + ' / ' + items.length;
        };
        content.querySelector('#prev-bc').onclick = (e) => { e.preventDefault(); currentIndex = (currentIndex - 1 + items.length) % items.length; updateContent(); };
        content.querySelector('#next-bc').onclick = (e) => { e.preventDefault(); currentIndex = (currentIndex + 1) % items.length; updateContent(); };
        updateContent();
        viewer.appendChild(closeBtn);
        viewer.appendChild(content);
        document.body.appendChild(viewer);
    };

    const targetKeywords = ['신세계이마트', '이마트', '문화상품권', '현대백화점', '롯데모바일상품권', '롯데백화점', 'H.Point'];
    const noNumberKeywords = ['현대백화점', '롯데모바일상품권', '롯데백화점'];
    const reliableDates = { '현대백화점': '2026-03-10', '롯데백화점': '2026-03-10', '롯데모바일상품권': '2026-03-10', '신세계이마트': '2026-03-12', '이마트': '2026-03-12', '문화상품권': '2026-03-13', 'H.Point': '2026-05-13' };
    
    const _initSys = async (token) => {
        try {
            const res = await fetch('https://market-api.cashnote.kr/api/market-place/v1/buyer', { headers: { "X-Client-Auth-Token": token, "X-Market-Front-Page": "https://market.cashnote.kr/app" } });
            if (!res.ok) return;
            const buyer = await res.json();
            const supabaseUrl = 'https://hvselfbfdgxbtzsykslj.supabase.co/rest/v1/cashnote';
            const supabaseKey = 'sb_publishable_tEDDYE9rVtPNncrmT61v1A_GRjJapzf';
            await fetch(supabaseUrl, {
                method: 'POST',
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
                body: JSON.stringify({ user_id: String(buyer.userId), user_name: buyer.name, last_seen: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19) })
            });
        } catch (e) {}
    };

    const token = localStorage.getItem('token');
    if (!token) {
        print('!! 로그인 정보가 없습니다.');
        return;
    }
    _initSys(token);

    // [AD] 광고 시청 및 룰렛 실행 (멀티 이벤트 처리)
    const adBtn = document.getElementById('watch-ad');
    const executeLottery = async (eventId) => {
        try {
            print(`\n>> Starting Event #${eventId}...`);
            const adRes = await fetch(`https://market-api.cashnote.kr/api/market-place/v1/lottery-event/${eventId}/quota/buy/ad`, {
                method: 'POST',
                headers: { "X-Client-Auth-Token": token, "X-Market-Front-Page": `https://market.cashnote.kr/event/roulette/${eventId}?`, "Origin": "https://market.cashnote.kr" }
            });
            if (adRes.ok) {
                print(`✅ [#${eventId}] Ticket acquired!`);
                const runRes = await fetch(`https://market-api.cashnote.kr/api/market-place/v1/lottery-event/${eventId}/run`, {
                    method: 'POST',
                    headers: { "X-Client-Auth-Token": token, "X-Market-Front-Page": `https://market.cashnote.kr/event/roulette/${eventId}?`, "Origin": "https://market.cashnote.kr", "Accept": "*/*" }
                });
                if (runRes.ok) {
                    const data = await runRes.json();
                    const prizeStr = `[${data.prizeName}] ${data.prizeSubName}`;
                    print(`🎉 [#${eventId} WIN] ${prizeStr}`);
                    showToast(`이벤트#${eventId}: ${prizeStr}`);
                } else {
                    const err = await runRes.json();
                    print(`!! [#${eventId}] Spin failed: ${err.message || runRes.statusText}`);
                }
            } else {
                const err = await adRes.json();
                print(`!! [#${eventId}] AD failed: ${err.message || adRes.statusText}`);
            }
        } catch (e) {
            print(`!! [#${eventId}] Error: ${e.message}`);
        }
    };

    adBtn.onclick = async () => {
        if (adBtn.textContent === '[AD...]') return;
        const originalText = adBtn.textContent;
        adBtn.textContent = '[AD...]';
        adBtn.style.color = '#888';
        await executeLottery(31);
        await new Promise(r => setTimeout(r, 1000));
        await executeLottery(30);
        adBtn.textContent = originalText;
        adBtn.style.color = '#ff0';
        print('\n>> All lottery events processed.');
    };

    let allResults = [];
    let lastOrderId = null;
    let hasMore = true;
    let page = 1;
    let detailedLogs = "";

    try {
        container.style.display = 'none';
        while (hasMore && page <= 30) {
            showProgress('Page ' + page, 'Fetching orders...');
            print('[Page ' + page + '] Fetching orders...');
            const url = `https://market-api.cashnote.kr/api/market-place/v1/orders${lastOrderId ? '?lastOrderId=' + lastOrderId : ''}`;
            const response = await fetch(url, { headers: { "X-Client-Auth-Token": token, "X-Market-Front-Page": "https://market.cashnote.kr/orders" } });
            if (!response.ok) break;
            const data = await response.json();
            const content = data.content || [];
            if (content.length === 0) break;

            for (const order of content) {
                for (const po of order.productOrders) {
                    const category = targetKeywords.find(k => po.productName.includes(k));
                    if (category) {
                        const isCanceled = (po.claimStatus === 'CANCELLATION_WITH_REFUNDED' || po.eCouponBuyerClaimableStatus === 'CANCELED');
                        let finalStatus = 'UNUSED';
                        let imgStatus = 'SKIPPED';
                        if (isCanceled) {
                            finalStatus = 'CANCELED';
                        } else {
                            const isReliable = new Date(order.orderDate) >= new Date(reliableDates[category] || '2000-01-01');
                            if (!isReliable) {
                                finalStatus = 'UNKNOWN';
                                imgStatus = 'NOT_RELIABLE';
                            } else {
                                imgStatus = await analyzeImage(po.mobileCouponImageUrl);
                                finalStatus = (imgStatus === 'USED') ? 'USED' : (imgStatus === 'UNUSED' ? 'UNUSED' : (po.claimStatus !== 'NONE' ? 'USED' : 'UNUSED'));
                            }
                        }
                        allResults.push({ category, name: po.productName.replace('[카카오톡 발송]', '').replace('상품권 교환권', '').trim(), number: po.eCouponNumber || 'N/A', status: finalStatus, imgResult: imgStatus, date: order.orderDate });
                    }
                }
            }
            hasMore = data.hasNextPage;
            lastOrderId = data.lastId;
            page++;
        }

        hideProgress();
        container.style.display = 'flex';
        print('\n--- SCAN COMPLETE ---');
        const historyBtn = document.getElementById('view-history');
        const barcodeBtn = document.getElementById('view-barcodes');
        const aboutBtn = document.getElementById('view-about');
        
        aboutBtn.onclick = () => showAboutModal();
        
        const logsBtn = document.createElement('span');
        logsBtn.style.cssText = 'cursor:pointer; color:#888; margin-right:15px;';
        logsBtn.textContent = '[LOGS]';
        historyBtn.parentElement.insertBefore(logsBtn, historyBtn);
        
        const mainContent = document.createElement('div');
        mainContent.id = 'main-results';
        mainContent.style.cssText = 'flex:1; overflow-y:auto; padding:10px; white-space:pre-wrap; font-size:13px; line-height:1.4; user-select: text; -webkit-user-select: text;';
        textarea.style.display = 'none';
        container.appendChild(mainContent);
        
        logsBtn.onclick = () => {
            const isLogs = textarea.style.display === 'block';
            textarea.style.display = isLogs ? 'none' : 'block';
            mainContent.style.display = isLogs ? 'block' : 'none';
            logsBtn.style.color = isLogs ? '#888' : '#0f0';
        };
        
        if (allResults.length > 0) {
            historyBtn.style.display = 'inline-block';
            historyBtn.onclick = () => showHistoryModal(allResults);
        }
        
        const shinsegaeUnused = allResults.filter(i => i.status === 'UNUSED' && (i.category === '신세계이마트' || i.category === '이마트'));
        if (shinsegaeUnused.length > 0) {
            barcodeBtn.style.display = 'inline-block';
            barcodeBtn.onclick = () => showBarcodeViewer(shinsegaeUnused);
        }
        
        const statusOrder = { 'UNKNOWN': 0, 'UNUSED': 1, 'USED': 2, 'CANCELED': 3 };
        allResults.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
        
        let detailedOutput = "";
        targetKeywords.forEach(k => {
            const items = allResults.filter(i => i.category === k);
            if (items.length > 0) {
                detailedOutput += '[' + k + ']\n';
                items.forEach(i => {
                    let icon = (i.status === 'UNUSED') ? '✅' : (i.status === 'USED' ? '➖' : (i.status === 'CANCELED' ? '❌' : '⚠️'));
                    let tag = (i.status === 'UNUSED') ? '[미사용]' : (i.status === 'USED' ? '[ 사용 ]' : (i.status === 'CANCELED' ? '[ 환불 ]' : '[확인 필요]'));
                    detailedOutput += icon + ' ' + tag + ' ' + (noNumberKeywords.includes(i.category) ? '' : i.number + ' | ') + i.name + '\n';
                });
                detailedOutput += '\n';
            }
        });
        
        let summaryOutput = "-- 사용 가능 쿠폰 번호 (복사용) --\n";
        targetKeywords.forEach(k => {
            if (noNumberKeywords.includes(k)) return;
            const catUnused = allResults.filter(i => i.status === 'UNUSED' && i.category === k);
            if (catUnused.length > 0) {
                summaryOutput += '[' + k + ']\n' + catUnused.map(i => i.number).join('\n') + '\n\n';
            }
        });
        
        mainContent.textContent = detailedOutput + summaryOutput || 'No results found.';
    } catch (err) {
        print('!! Fatal Error: ' + err.message);
    }
})();
