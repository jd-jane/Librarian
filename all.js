// 圖書管理員小幫手 - 核心邏輯
let allMatches = [];
let isExpanded = false;

// 頁面加載完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    renderHistory();
});

// 處理搜尋輸入 (Enter 鍵)
function handleKeyPress(e) {
    if (e.key === 'Enter') {
        const query = e.target.value.trim();
        if (query) {
            performSearch(query);
        }
    }
}

// 執行搜尋邏輯 (串接 Google Books API)
async function performSearch(query) {
    const loader = document.getElementById('loader');
    const tableBody = document.getElementById('tableBody');
    const expandBtn = document.getElementById('expandBtn');
    
    // UI 重置
    loader.style.display = 'block';
    tableBody.innerHTML = '';
    expandBtn.style.display = 'none';
    
    try {
        // 串接 Google Books API, 繁體中文優先
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(query)}&langRestrict=zh-Hant&maxResults=20`);
        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px;">查無結果，請試試其他關鍵字 📚</td></tr>';
            loader.style.display = 'none';
            return;
        }

        // 解析與轉換資料
        allMatches = data.items.map(item => {
            const info = item.volumeInfo;
            // 尋找 ISBN_13, 若無則找 ISBN_10
            const identifiers = info.industryIdentifiers || [];
            const isbnObj = identifiers.find(id => id.type === 'ISBN_13') || identifiers.find(id => id.type === 'ISBN_10');
            const isbn = isbnObj ? isbnObj.identifier : '無 ISBN';
            
            return {
                title: info.title,
                author: info.authors ? info.authors.join(', ') : '未知作者',
                isbn: isbn,
                publishedDate: info.publishedDate || '0000',
                linkTitle: info.title.replace(/\s+/g, '') // 用於搜尋連結
            };
        });

        // 排序：最新版本優先 (依照出版日期降序)
        allMatches.sort((a, b) => b.publishedDate.localeCompare(a.publishedDate));

        // 儲存至歷史紀錄
        saveHistory(query);

        isExpanded = false;
        renderTable();
    } catch (error) {
        console.error("搜尋發生錯誤:", error);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red; padding: 20px;">搜尋失敗，請檢查網路連線</td></tr>';
    } finally {
        loader.style.display = 'none';
    }
}

// 渲染表格結果
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    const expandBtn = document.getElementById('expandBtn');

    // 預設顯示前 3 筆，展開後顯示全部
    const displayData = isExpanded ? allMatches : allMatches.slice(0, 3);

    tableBody.innerHTML = displayData.map(book => {
        // 博客來搜尋連結 (優先用 ISBN)
        const booksLink = book.isbn !== '無 ISBN' 
            ? `https://search.books.com.tw/search/query/key/${book.isbn}/cat/all`
            : `https://search.books.com.tw/search/query/key/${encodeURIComponent(book.title)}/cat/all`;
        
        // 北市圖搜尋連結
        const tpmlLink = `https://book.tpml.edu.tw/search?queryValue=${encodeURIComponent(book.title)}&queryField=Title`;

        return `
            <tr>
                <td data-label="書名" style="font-weight:bold;">${book.title}</td>
                <td data-label="作者">${book.author}</td>
                <td data-label="ISBN"><code style="background:#f0f0f0; padding:2px 4px; border-radius:4px;">${book.isbn}</code></td>
                <td data-label="博客來"><a href="${booksLink}" target="_blank" class="btn-link">博客來</a></td>
                <td data-label="北市圖"><a href="${tpmlLink}" target="_blank" class="btn-link">北市圖</a></td>
            </tr>
        `;
    }).join('');

    // 若結果多於 3 筆，顯示展開按鈕
    if (allMatches.length > 3) {
        expandBtn.style.display = 'block';
        expandBtn.innerText = isExpanded ? "收合結果" : `展開更多結果 (${allMatches.length - 3}+)`;
    }
}

// 展開/收合切換
function toggleMore() {
    isExpanded = !isExpanded;
    renderTable();
}

// --- 歷史紀錄邏輯 ---

function saveHistory(query) {
    let history = JSON.parse(localStorage.getItem('bookSearchHistory') || '[]');
    // 去重並將最新搜尋排在最前
    history = [query, ...history.filter(item => item !== query)].slice(0, 8);
    localStorage.setItem('bookSearchHistory', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const section = document.getElementById('historySection');
    const tagsContainer = document.getElementById('historyTags');
    const history = JSON.parse(localStorage.getItem('bookSearchHistory') || '[]');

    if (history.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    tagsContainer.innerHTML = history.map(item => `
        <span class="history-tag" onclick="clickHistory('${item}')">${item}</span>
    `).join('');
}

function clickHistory(query) {
    document.getElementById('searchInput').value = query;
    performSearch(query);
}

function clearHistory() {
    localStorage.removeItem('bookSearchHistory');
    renderHistory();
}