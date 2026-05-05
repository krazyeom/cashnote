/**
 * 캐시노트 쿠폰 추출기 (이미지 분석 AI 버전)
 * 
 * 주요 기능:
 * 1. 이미지 분석: Canvas API를 사용하여 이미지 좌측 상단의 '사용 완료' 도장을 픽셀 단위로 감지
 * 2. 페이징 처리: lastOrderId 기반 전체 주문 내역 자동 스캔
 * 3. 스마트 분류: 미사용 쿠폰 우선 정렬 및 카테고리별 정리
 */

(async function startAdvancedExtraction() {
    // [1] UI 터미널 생성
    const logId = 'cashnote-terminal';
    if (document.getElementById(logId)) document.getElementById(logId).remove();

    const container = document.createElement('div');
    container.id = logId;
    container.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 400px; 
        z-index: 100000; background: #000; color: #0f0; border-bottom: 2px solid #0f0;
        font-family: 'Courier New', monospace; display: flex; flex-direction: column;
    `;
    
    const header = document.createElement('div');
    header.style.cssText = 'padding: 5px 10px; background: #111; font-size: 11px; border-bottom: 1px solid #333; display: flex; justify-content: space-between;';
    header.innerHTML = '<span>CASHNOTE IMAGE ANALYZER v3.0</span><span id="close-terminal" style="cursor:pointer; color:#f00;">[CLOSE]</span>';
    
    const textarea = document.createElement('textarea');
    textarea.style.cssText = 'flex: 1; width: 100%; background: transparent; color: #0f0; border: none; padding: 10px; font-size: 13px; outline: none; resize: none; line-height: 1.4;';
    textarea.readOnly = true;
    textarea.value = 'Initializing Advanced Image Analysis...\n';
    
    container.appendChild(header);
    container.appendChild(textarea);
    document.body.appendChild(container);
    document.getElementById('close-terminal').onclick = () => container.remove();

    const print = (msg) => {
        textarea.value += msg + '\n';
        textarea.scrollTop = textarea.scrollHeight;
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

                    let darkGrayPixels = 0;
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i], g = data[i+1], b = data[i+2];
                        // 도장의 회색 특징: R, G, B가 비슷하고 중간 밝기(80~180)인 경우
                        const avg = (r + g + b) / 3;
                        const diff = Math.max(r, g, b) - Math.min(r, g, b);
                        if (avg > 70 && avg < 190 && diff < 30) {
                            darkGrayPixels++;
                        }
                    }

                    // 해당 영역에서 회색 픽셀 비중이 15% 이상이면 도장으로 판단
                    const ratio = darkGrayPixels / (data.length / 4);
                    resolve(ratio > 0.15 ? 'USED' : 'UNUSED');
                } catch (e) {
                    resolve('CORS_ERROR'); // 보안 정책으로 분석 불가 시
                }
            };
            img.onerror = () => resolve('LOAD_ERROR');
            img.src = url;
        });
    };

    // [3] 메인 수집 루프
    const targetKeywords = ['신세계이마트', '이마트', '문화상품권'];
    
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

    try {
        while (hasMore && page <= 30) {
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

                        allResults.push({
                            category,
                            name: po.productName.replace('[카카오톡 발송]', '').trim(),
                            number: po.eCouponNumber || 'N/A',
                            status: finalStatus,
                            imgResult: imgStatus
                        });
                    }
                }
            }

            hasMore = data.hasNextPage;
            lastOrderId = data.lastId;
            page++;
        }

        // [4] 최종 출력 및 정렬
        print('\n--- SCAN COMPLETE ---');
        
        // 정렬 순서: 미사용 -> 사용완료 -> 취소
        const statusOrder = { 'UNUSED': 0, 'USED': 1, 'CANCELED': 2 };
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
                    let tag = '[ AVAILABLE ]';
                    if (i.status === 'USED') { icon = '➖'; tag = '[   USED    ]'; }
                    if (i.status === 'CANCELED') { icon = '❌'; tag = '[ CANCELED  ]'; }
                    
                    detailedOutput += `${icon} ${tag} ${i.number} | ${i.name}\n`;
                });
                detailedOutput += '\n';
            }
        });

        // 미사용 번호 모음 (가장 하단)
        let summaryOutput = "--- AVAILABLE COUPONS ---\n";
        targetKeywords.forEach(k => {
            const categoryUnused = unusedCoupons.filter(i => i.category === k);
            if (categoryUnused.length > 0) {
                summaryOutput += `[${k}]\n`;
                summaryOutput += `${categoryUnused.map(i => i.number).join('\n')}\n\n`;
            }
        });

        print(detailedOutput + summaryOutput || 'No results found.');

        print(detailedOutput + summaryOutput || 'No results found.');

    } catch (err) {
        print(`!! Fatal Error: ${err.message}`);
    }
})();


