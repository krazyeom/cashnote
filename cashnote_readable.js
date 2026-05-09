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
            <span id="view-about" style="cursor:pointer; color:#aaa; margin-right:15px;">[ABOUT]</span>
            <span id="view-history" style="cursor:pointer; color:#fff; margin-right:15px; display:none;">[HISTORY]</span>
            <span id="view-barcodes" style="cursor:pointer; color:#0f0; margin-right:15px; display:none;">[VIEW BARCODES]</span>
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

    // [1-1] 정보창 (ABOUT) 모달
    const showAboutModal = () => {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:100005; display:flex; align-items:center; justify-content:center; color:#fff; font-family:sans-serif;';
        modal.onclick = () => modal.remove();
        
        const card = document.createElement('div');
        card.style.cssText = 'background:#222; padding:25px; border-radius:15px; width:85%; max-width:350px; border:1px solid #444;';
        card.onclick = (e) => e.stopPropagation();
        
        card.innerHTML = `
            <div style="font-size:18px; font-weight:bold; margin-bottom:15px; color:#0f0; border-bottom:1px solid #444; padding-bottom:10px;">Version History</div>
            <div style="font-size:13px; line-height:1.6; max-height:300px; overflow-y:auto; padding-right:5px;">
                <b>v5.7</b>: 터미널 헤더 버튼 테두리 제거 (디자인 간소화)<br>
                <b>v5.6</b>: 터미널 헤더 버튼 디자인 통일 (테두리 추가)<br>
                <b>v5.5</b>: 분석 진행 상황 오버레이 도입 (상세 로그 분리)<br>
                <b>v5.4</b>: 구입 날짜별 내역(HISTORY) 기능 추가<br>
                <b>v5.3</b>: 주문 일자별 이미지 분석 신뢰도 판별<br>
                <b>v5.2</b>: 모바일 더블 탭 확대 방지 (touch-action)<br>
                <b>v5.1</b>: 터치 이벤트 유실 및 DOM 업데이트 최적화<br>
                <b>v5.0</b>: 바코드 뷰어 모바일 UI 개선 (사이드 버튼)<br>
                <b>v4.9</b>: 주문 페이지 미접속 시 자동 이동 로직<br>
                <div style="margin-top:20px; color:#888; text-align:center;">made by <b>krazyeom</b></div>
            </div>
            <button style="width:100%; margin-top:20px; padding:10px; background:#444; color:#fff; border:none; border-radius:5px; cursor:pointer;">닫기</button>
        `;
        card.querySelector('button').onclick = () => modal.remove();
        modal.appendChild(card);
        document.body.appendChild(modal);
    };
    document.getElementById('view-about').onclick = showAboutModal;

    // [1-2] 구입 내역 (HISTORY) 모달
    const showHistoryModal = (results) => {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:100005; display:flex; align-items:center; justify-content:center; color:#fff; font-family:sans-serif;';
        modal.onclick = () => modal.remove();
        
        const card = document.createElement('div');
        card.style.cssText = 'background:#111; padding:25px; border-radius:15px; width:90%; max-width:400px; border:1px solid #333; max-height:80vh; overflow-y:auto;';
        card.onclick = (e) => e.stopPropagation();
        
        // 날짜별 그룹화
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
                            let statusIcon = '✅';
                            if (i.status === 'USED') statusIcon = '➖';
                            if (i.status === 'CANCELED') statusIcon = '❌';
                            if (i.status === 'UNKNOWN') statusIcon = '⚠️';
                            return `• ${statusIcon} ${i.name}`;
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

    // [1-3] 진행 상황 오버레이 (PROGRESS)
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

    // [2] 이미지 분석 함수 (핵심 로직)
    const analyzeImage = (url) => {
        return new Promise((resolve) => {
            if (!url) return resolve('UNKNOWN');
            const img = new Image();
            img.crossOrigin = "Anonymous"; // CORS 허용 설정
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    // 도장이 찍히는 좌측 상단 영역(30% x 30%) 추출
                    const checkW = img.width * 0.3;
                    const checkH = img.height * 0.3;
                    const imageData = ctx.getImageData(0, 0, checkW, checkH);
                    const data = imageData.data;

                    let grayPixels = 0;
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i], g = data[i+1], b = data[i+2];
                        const avg = (r + g + b) / 3;
                        const diff = Math.max(r, g, b) - Math.min(r, g, b);
                        // 도장의 회색 특징: R, G, B가 비슷하고 중간 밝기(70~190)인 경우
                        if (avg > 70 && avg < 190 && diff < 30) grayPixels++;
                    }

                    // 해당 영역에서 회색 픽셀 비중이 15% 이상이면 도장으로 판단
                    const ratio = grayPixels / (data.length / 4);
                    resolve(ratio > 0.15 ? 'USED' : 'UNUSED');
                } catch (e) {
                    resolve('CORS_ERROR'); // 보안 정책으로 분석 불가 시
                }
            };
            img.onerror = () => resolve('LOAD_ERROR');
            img.src = url;
        });
    };
    
    // [2-1] 바코드 뷰어 함수
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
        
        // 정적 구조 생성
        content.innerHTML = `
            <div id="bc-amount" style="font-size:18px; font-weight:bold; margin-bottom:10px; color:#333;"></div>
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
            imgEl.src = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${item.number}&scale=3&rotate=N&includetext=false`;
            numberEl.textContent = item.number;
            indexEl.textContent = `${currentIndex + 1} / ${items.length}`;
        };
        
        content.querySelector('#prev-bc').onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            currentIndex = (currentIndex - 1 + items.length) % items.length;
            updateContent();
        };
        
        content.querySelector('#next-bc').onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            currentIndex = (currentIndex + 1) % items.length;
            updateContent();
        };
        
        updateContent();
        
        updateContent();
        viewer.appendChild(closeBtn);
        viewer.appendChild(content);
        document.body.appendChild(viewer);
    };

    // [3] 메인 수집 루프
    const targetKeywords = ['신세계이마트', '이마트', '문화상품권', '현대백화점', '롯데모바일상품권', '롯데백화점'];
    const noNumberKeywords = ['현대백화점', '롯데모바일상품권', '롯데백화점'];
    
    // 브랜드별 이미지 분석 도입 시점 (이전 주문은 사용여부 확인 불가)
    const reliableDates = {
        '현대백화점': '2026-03-10',
        '롯데백화점': '2026-03-10',
        '롯데모바일상품권': '2026-03-10',
        '신세계이마트': '2026-03-12',
        '이마트': '2026-03-12',
        '문화상품권': '2026-03-13'
    };
    
    // 로컬스토리지의 'token' 키를 가져옵니다.
    const token = localStorage.getItem('token');

    if (!token) {
        print('!! 로그인 정보가 없습니다. 로그인이 되어 있는지 확인해 주세요.');
        return;
    }

    let allResults = [];
    let lastOrderId = null;
    let hasMore = true;
    let page = 1;
    let detailedLogs = "";

    try {
        container.style.display = 'none'; // 분석 중에는 터미널 숨김
        
        while (hasMore && page <= 30) {
            showProgress(`Page ${page}`, `Fetching orders...`);
            print(`[Page ${page}] Fetching orders...`);
            const url = `https://market-api.cashnote.kr/api/market-place/v1/orders${lastOrderId ? '?lastOrderId=' + lastOrderId : ''}`;
            const response = await fetch(url, {
                headers: { "X-Client-Auth-Token": token, "X-Market-Front-Page": "https://market.cashnote.kr/orders" }
            });

            if (!response.ok) break;
            const data = await response.json();
            const content = data.content || [];
            if (content.length === 0) break;

            for (const order of content) {
                for (const po of order.productOrders) {
                    const category = targetKeywords.find(k => po.productName.includes(k));
                    if (category) {
                        const couponUrl = po.mobileCouponImageUrl;
                        
                        // [최적화] 취소/환불된 건은 이미지 분석 없이 즉시 'CANCELED' 처리
                        const isAlreadyCanceled = (po.claimStatus === 'CANCELLATION_WITH_REFUNDED' || po.eCouponBuyerClaimableStatus === 'CANCELED');
                        
                        let finalStatus = 'UNUSED';
                        let imgStatus = 'SKIPPED';

                        if (isAlreadyCanceled) {
                            finalStatus = 'CANCELED';
                        } else {
                            // 날짜 기반 신뢰도 체크
                            const orderDate = new Date(order.orderDate);
                            const threshold = new Date(reliableDates[category] || '2000-01-01');
                            const isReliable = orderDate >= threshold;

                            if (!isReliable) {
                                finalStatus = 'UNKNOWN';
                                imgStatus = 'NOT_RELIABLE';
                                print(` Skip Date: ${po.productName.substring(0,10)}...`);
                            } else {
                                showProgress(`Page ${page}`, `Analyzing Image...`);
                                print(` Analyzing Image: ${po.productName.substring(0, 15)}...`);
                                imgStatus = await analyzeImage(couponUrl);
                                
                                if (imgStatus === 'USED') {
                                    finalStatus = 'USED';
                                } else if (imgStatus === 'UNUSED') {
                                    finalStatus = 'UNUSED';
                                } else {
                                    // 분석 실패 시 API 상태로 최종 판단
                                    finalStatus = (po.claimStatus !== 'NONE') ? 'USED' : 'UNUSED';
                                }
                            }
                        }

                        allResults.push({
                            category,
                            name: po.productName.replace('[카카오톡 발송]', '').replace('상품권 교환권', '').trim(),
                            number: po.eCouponNumber || 'N/A',
                            status: finalStatus,
                            imgResult: imgStatus,
                            date: order.orderDate
                        });
                    }
                }
            }

            hasMore = data.hasNextPage;
            lastOrderId = data.lastId;
            page++;
        }

        hideProgress();
        container.style.display = 'flex'; // 분석 완료 후 터미널 표시
        
        // [4] 최종 출력 및 정렬
        print('\n--- SCAN COMPLETE ---');
        
        const barcodeBtn = document.getElementById('view-barcodes');
        const historyBtn = document.getElementById('view-history');
        const aboutBtn = document.getElementById('view-about');
        
        // 상세 로그 보기 버튼 추가
        const logsBtn = document.createElement('span');
        logsBtn.id = 'view-logs';
        logsBtn.style.cssText = 'cursor:pointer; color:#888; margin-right:15px;';
        logsBtn.textContent = '[LOGS]';
        aboutBtn.parentElement.insertBefore(logsBtn, aboutBtn.nextSibling);
        
        const mainContent = document.createElement('div');
        mainContent.id = 'main-results';
        mainContent.style.cssText = 'flex:1; overflow-y:auto; padding:10px; white-space:pre-wrap; font-size:13px; line-height:1.4;';
        
        textarea.style.display = 'none'; // 초기에는 상세 로그 숨김
        container.appendChild(mainContent);
        
        logsBtn.onclick = () => {
            const isLogsVisible = textarea.style.display === 'block';
            textarea.style.display = isLogsVisible ? 'none' : 'block';
            mainContent.style.display = isLogsVisible ? 'block' : 'none';
            logsBtn.style.color = isLogsVisible ? '#888' : '#0f0';
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
        
        // 정렬 순서: 미사용 -> 사용완료 -> 취소
        // 정렬 순서: 확인필요 -> 미사용 -> 사용완료 -> 취소
        const statusOrder = { 'UNKNOWN': 0, 'UNUSED': 1, 'USED': 2, 'CANCELED': 3 };
        allResults.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

        const unusedCoupons = allResults.filter(i => i.status === 'UNUSED');
        
        // 상세 내역 (먼저 출력)
        let detailedOutput = "";
        targetKeywords.forEach(k => {
            const items = allResults.filter(i => i.category === k);
            if (items.length > 0) {
                detailedOutput += `[${k}]\n`;
                items.forEach(i => {
                    let icon = '✅';
                    let tag = '[미사용]';
                    if (i.status === 'USED') { icon = '➖'; tag = '[ 사용 ]'; }
                    if (i.status === 'CANCELED') { icon = '❌'; tag = '[ 환불 ]'; }
                    if (i.status === 'UNKNOWN') { icon = '⚠️'; tag = '[확인 필요]'; }
                    
                    const isNoNumber = noNumberKeywords.includes(i.category);
                    const numberPart = isNoNumber ? '' : `${i.number} | `;
                    detailedOutput += `${icon} ${tag} ${numberPart}${i.name}\n`;
                });
                detailedOutput += '\n';
            }
        });

        // 미사용 번호 모음 (가장 하단)
        let summaryOutput = "-- 사용 가능 쿠폰 번호 (복사용) --\n";
        targetKeywords.forEach(k => {
            if (noNumberKeywords.includes(k)) return; // 번호 추출이 필요 없는 카테고리는 제외
            const categoryUnused = unusedCoupons.filter(i => i.category === k);
            if (categoryUnused.length > 0) {
                summaryOutput += `[${k}]\n`;
                summaryOutput += `${categoryUnused.map(i => i.number).join('\n')}\n\n`;
            }
        });

        mainContent.textContent = detailedOutput + summaryOutput || 'No results found.';
        textarea.value = detailedLogs;

    } catch (err) {
        print(`!! Fatal Error: ${err.message}`);
    }
})();


