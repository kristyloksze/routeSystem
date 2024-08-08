document.addEventListener('DOMContentLoaded', function() {
    const stationSelect = document.getElementById('station-select');
    const routeSelect = document.getElementById('route-select');
    const scheduleContainer = document.getElementById('schedule-container');
    const addEditModal = new bootstrap.Modal(document.getElementById('add-edit-modal'));
    const addEditTitle = document.getElementById('add-edit-title');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const dayTypeSelect = document.getElementById('day-type');
    const addScheduleButton = document.getElementById('add-schedule');
    const deleteScheduleButton = document.getElementById('delete-schedule');
    const confirmDeleteModal = new bootstrap.Modal(document.getElementById('confirm-delete-modal'));
    const confirmDeleteButton = document.getElementById('confirm-delete');
    const saveScheduleButton = document.getElementById('save-schedule');
    const startScheduleButton = document.getElementById('start-schedule'); //0730

    
    //以下是全域變數property
    let schedules = [];
    let originalSchedules = [];
    let selectedSchedules = [];
    let editedSchedules = new Set(); 
    let currentSortOrder = 'asc'; //0726
    let editingScheduleIndex = null;



//使用'fetch'來加載'routes.xlsx'，並將內容解析為一個'Uint8Array'，再使用'XLSX'庫來讀取和處理這些數據//
    //發送一個HTTP請求來獲取這份excel文件
    fetch('routes.xlsx')

        //請求成功後執行，將響應對象轉換為'arrayBuffer'(這是一個通用的二進制數據緩衝區[內存區域])
        .then(response => response.arrayBuffer())

        //處理excel文件的數據
        .then(data => {

            //'XLSX'是一個JavaScript庫，用來讀取和處理excel文件，將其博換成JavaScript對象或數組
                //'Unit8Array'是JavaScript中的一種'TypedArray'(它是一組視圖)，用來表示一個8位無符號整數(0~255)的陣列，可以用作處理二進制數據
            const workbook = XLSX.read(new Uint8Array(data), {type:'array'});
            
            //獲取excel中的工作表名稱('SheetNames')
            const sheetNames = workbook.SheetNames;
            let currentSheet = null; //0725
            //操作HTML：初始化'stationSelect'的下拉選單為「請選擇」
            stationSelect.innerHTML = '<option value="">請選擇</option>';
            
            //將'sheetNames'中的內容一個個丟出來
            sheetNames.forEach(sheetName => {

                //為每個'sheetNames'創建一個'option'元素，並加在'stationSelect'下拉選單中
                const option = document.createElement('option');
                option.value = sheetName;
                option.textContent = sheetName;
                stationSelect.appendChild(option);
            });

            //監聽'stationSelect'：當user選擇不同的'stationSelect'時，更新'routeSelect'和'scheduleContainer'
            stationSelect.addEventListener('change', () => {

                //操作HTML：清空'routeSelect'的內容
                routeSelect.innerHTML = '';

                //若選擇了一個工作表，則調用'loadRoutes(currentSheet)'函數來加載並顯示選定工作表中的路線
                if (stationSelect.value) {
                    currentSheet = workbook.Sheets[stationSelect.value];

                    //此為自定義函數，用作加載並顯示'currentSheet'的路線
                    loadRoutes(currentSheet);

                //若沒有選擇工作表
                } else {
                    //清空'routeSelect'和'scheduleContainer'的內容
                    routeSelect.innerHTML = '';
                    scheduleContainer.innerHTML = '';
                    //以下兩個按鈕也會跟著消失
                    //document.getElementById('save-changes').classList.add('d-none'); //0806註解
                    document.getElementById('start-schedule').classList.add('d-none'); //0730
                }
            });
        })
        
        //錯誤處理
        .catch(error => console.error('Error loading Excel file:', error));



    // 加載路線 --> 處理工作表數據 --> 顯示和管理班表//   
    function loadRoutes(sheet) {

        //將工作表數據轉換成JSON格式，每一行都是一個數組
        const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        //以下這行的作用是從工作表數據中提取唯一的路線名稱並保存到一個數組中。具體步驟如下：
            //'new Set(xxxxx)'：將過濾後的數據轉換成一個'set'對象，從而自動去除重複的路線名稱
            //'...new Set(xxxxx)'：使用展開運算符'...'將'Set'對象轉換回數組，從而獲得唯一的路線名稱數組
            //'.slice(1)'：跳過第一行(通常是標題行)
            //'map(row=>row[1])'：對'sheetData'中每一行數據應用'map'函數去提取每一行的第二列資料（路線名稱）
            //'filter(route=>route)'：使用'filter'函數過濾掉所有空值
        const routes = [...new Set(sheetData.slice(1).map(row => row[1]).filter(route => route))];
        
        //操作HTML：初始化'routeSelect'下拉選單
        routeSelect.innerHTML = '<option value="">請選擇</option>';

        routes.forEach(route => {

            //為每個'route'創建'option'
            const option = document.createElement('option');
            option.value = route;
            option.textContent = route;
            routeSelect.appendChild(option);
        });

        //當user選擇不同路線時('change')，更新'schedules'
        routeSelect.addEventListener('change', () => {

            //當'routeSelect'發生變化時，清空'selectedSchedules'的數組，確保沒有選擇任何行程
            selectedSchedules = [];

            //檢查'routeSelect.value'是否為空，若有選擇的route便繼續執行；否則清空'scheduleContainer'的內容
            if (routeSelect.value) {

                //使用'filter'過濾出'sheetData'中符合所選路線的行程數據，只保留路線名稱與當前選擇的路線名稱相匹配的行
                    //'row=>row[1]===routeSelect.value'：箭頭函數的縮寫
                    //'row':'sheetData'數組中的每一行
                    //'row[1]'：該行數組中的第二個元素（e.g. 路線名稱）
                    //'routeSelect.value'：選擇器中當下所選的路線名稱
                    //'row[1]===routeSelect.value'：這是判斷條件，指若該行數組中的路線名稱與當前選擇的路線名稱一樣便回傳'true'，反之回傳'false'
                schedules = sheetData.filter(row => row[1] === routeSelect.value);

                //將過濾後的行程數據使用'JSON.parse'深拷貝到'originalSchedules'，以便日後需要恢復到原始狀態
                    //'parse'操作在不同的上下文中用於不同的數據格式，但核心概念是一致的：將一種格式的數據轉換為結構化、程序可用的數據形式
                originalSchedules = JSON.parse(JSON.stringify(schedules));
                
                //清空'editedSchedules'集合，這是一個儲存已編輯行程的集合
                editedSchedules.clear();
                                
                //調用'displaySchedules('all')'函數來顯示所有過濾後的'schedules'數據
                //此函數負責將'schedules'數據渲染到'scheduleContainer'中
                displaySchedules('all');

            //若沒有選擇，則清空'scheduleContainer'的內容
            } else {
                scheduleContainer.innerHTML = '';
            }
        });
    }



//轉換excel時間格式//
    //'convertExcelTime'：用於將excel中的時間格式轉換成常見的'HH:MM'
    function convertExcelTime(excelTime) {

        //這一行將excel時間(以天為單位)轉換成分鐘
            //'excelTime*24'：轉換成小時
            //'*60'：再轉換為分鐘
            //'Math.round'：四捨五入
        const totalMinutes = Math.round(excelTime * 24 * 60);

        //用作計算小時：將總分鐘除以60獲取小時數，再用'Math.floor'取整數(向下取整)
        //e.g. 125/60=2...5，125分鐘向下取整則會是「2個小時」
            //Math.floor是JavaScript中的數學函數，用於將一個數字取整到最接近、比該數字小的整數
            //此函數常用於需要將數字取整而不關心四捨五入的場景，比如計算時間、處理頁面分頁、限制數值範圍等。
        const hours = Math.floor(totalMinutes / 60);

        //用作計算分鐘的部分：使用'%'獲取剩餘的分鐘數
            //'totalMinutes%60'會回傳'totalMinutes'除60的餘數
            //e.g. 125/60＝2...5，即125分鐘是「2個小時後再5分鐘」
        const minutes = totalMinutes % 60;

        //'string(hours)'、'string(minutes)'：將「小時」和「分鐘」轉換為字符串
        //用'padStart'的方法填充字符串的前導零，以確保顯示出來是「兩位數」格式
            //padStart(2,'0')：第一個數字是指要「幾位數」；後面是字符串的開頭填充「指定的字符」
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }



//excel時間//
    //將時間字串轉換成Excel時間格式
    function parseTimeToExcel(timeString) {
        //拆分時間字串，並轉換成數字
            //'timeString.split(':')：'用'split'方法將'timeString'以':'分成兩部分
            //'map'：用'map'方法將陣列中每個元素轉換為數字
            //'[hours, minutes]'：將兩個值分別賦給'hours'和'minutes'
        const [hours, minutes] = timeString.split(':').map(Number);

        //計算小時和分鐘的總數，並轉換成一天中的小數部分
            //'(hours + minutes / 60)/24'：將分鐘轉換為小時，並加到小時上
            //將總小時數轉換為一天中的部分
        return (hours + minutes / 60) / 24;
    }



//選擇班次種類的下拉選單//
    //監聽'filterSelect'的'change'行為
    document.getElementById('filterSelect').addEventListener('change', function() {
        //獲取下拉選單中當前選中的值('this.value'：獲取選擇框當前選中的值)
        var filterValue = this.value;

        //若篩選值('filterValue')是 'all'，則顯示所有班次('all')
        if (filterValue === 'all') {displaySchedules('all')

        //若篩選值('filterValue')是 'holiday'，則顯示假日班次('holiday')
        } else if (filterValue === 'holiday') {displaySchedules('holiday')

        //若篩選值('filterValue')是 'workday'，則顯示工作日班次('workday')
        } else if (filterValue === 'workday') {displaySchedules('workday')
        }
    });



//0726 
//排序按鈕事件監聽
    document.getElementById('sort-schedule').addEventListener('click', function() {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc'; //切換排序順序
        displaySchedules(document.getElementById('filterSelect').value); //重新顯示班表並應用新排序
    });



//顯示班次//
    //定義displaySchedules去接受filter，用作過濾顯示的行程
    function displaySchedules(filter) {

        //0726
        const scheduleContainer = document.getElementById('schedule-container') 
        //將scheduleContainer的內容清空，準備顯示新的行程表
        
        scheduleContainer.innerHTML = ''; //原本就有的
        


        //根據'filter'所過濾的schedules數據（其中的值包括'holiday','workday','all'）
        const filteredSchedules = schedules.filter(schedule => {
            
            //若為holiday，僅顯示假日路線
            if (filter === 'holiday') {
                return schedule[5] === 1;

            //若是holiday僅顯示假日路線
            } else if (filter === 'workday') {
                return schedule[5] === 0;

            //反之，顯示全部
            } else {
                return true;
            }
        });

        //檢查'filterSchedules'是否為空
        if (filteredSchedules.length > 0) {

            //根據'currentSortOrder'按照升序或降序對filter後的'schedule'進行排序
            //在sort()的比較函數中會有兩個比較元素(a,b)
            //比較的方法會是選擇第一個基準元素，再來將所有數組分區分為「小於基準組」和「大於基準組」，再來分別進行同樣的比較排序，最後再將這三個結果合併
            const sortedSchedules = filteredSchedules.sort((a, b) => {
                
                //抓取並解析'a'的出發時間為浮點數
                const timeA = parseFloat(a[3]);

                //抓取並解析'b'的出發時間為浮點數
                const timeB = parseFloat(b[3]);

                //如果返回值小於 0（timeA - timeB < 0），表示 a 應該排在 b 之前。
                //如果返回值等於 0（timeA - timeB === 0），表示 a 和 b 的順序不變。
                //如果返回值大於 0（timeA - timeB > 0），表示 a 應該排在 b 之後。
                return currentSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
            });

            //創建一個新的表格（應用BS5的樣式）
            const table = document.createElement('table');
            //此為BS5的表格樣式
            table.className = 'table table-striped';

            //創建表格的表頭
            const thead = document.createElement('thead');
            //操作HTML
            thead.innerHTML = `
            <tr>
                <th>選擇</th>
                <th>出發時間</th>
                <th>到站時間</th>
                <th>勤務時間 (分鐘)</th>
                <th>平假日</th>
                <th>操作</th>
            </tr>
        `;
            //將表頭'thead'插入'table'中
            table.appendChild(thead);

            //創建表格的主體，並將每個排序後的路線創建一個'tr'(行)
            const tbody = document.createElement('tbody');
            sortedSchedules.forEach(schedule => {
                const startTime = convertExcelTime(schedule[3]);
                //0808 API 取代上面code: const startTime = convertExcelTime(schedule.start_time);
                const endTime = convertExcelTime(schedule[4]);
                const dutyTime = calculateDutyTimeInMinutes(schedule[3], schedule[4]);
                //0808 註解 const isWorkday = schedule[5] === 1;
                const isHoliday = schedule[5] ===0;
                const row = document.createElement('tr');

                //若行程有被編輯過，則以'table-warning'顯示
                if (editedSchedules.has(schedule[0])) {
                    row.classList.add('table-warning');
                }

                //操作HTML：創建行內容(選擇框、出發時間、到站時間、勤務時間、平假日狀態、編輯按鈕)
                row.innerHTML = `
                <td><input type="checkbox" class="form-check-input schedule-checkbox" data-index="${schedule[0]}"></td>
                <td>${startTime}</td>
                <td>${endTime}</td>
                <td>${dutyTime}</td>
                <td>${isHoliday ? '假日' : '平日'}</td>
                <td><button class="btn btn-sm btn-secondary edit-schedule" data-index="${schedule[0]}">編輯</button></td>
            `;
                //將'tbody'插入'table'中
                tbody.appendChild(row);

                //為'row'添加'click'事件監聽器
                row.addEventListener('click', (event) => {
                    //檢查點擊目標是否既不是'.schedule-checkbox'也不是'.edit-schedule'
                        //'!'：不成立
                    if (!event.target.classList.contains('schedule-checkbox') && !event.target.classList.contains('edit-schedule')) {
                        const checkbox = row.querySelector('.schedule-checkbox');
                        //用作切換checkbox的狀態
                            //'checkbox.checked'指當前的狀態：'true'或'false'
                            //如果勾選框目前是已勾選狀態（true），這行程式碼會將它設置為未勾選（false）。
                            //如果勾選框目前是未勾選狀態（false），這行程式碼會將它設置為已勾選（true）。
                        checkbox.checked = !checkbox.checked;
                        //dispatch是發送'change'事件到'checkbox'元素
                        //讓系統知道'checkbox'的狀態已改變
                        checkbox.dispatchEvent(new Event('change'));
                    }
                });
                //為'.edit-schedule'添加點擊事件監聽器
                row.querySelector('.edit-schedule').addEventListener('click', (event) => {
                    event.stopPropagation();
                    //調用'editSchedule'來編輯行程
                    editSchedule(schedule[0]);
                });
            });

            //將'tbody'添加到'table'
            table.appendChild(tbody);
            //將'table'添加到'scheduleContainer'（它是一個DOM元素）
            scheduleContainer.appendChild(table);

            //為所有checkbox新增監聽器
            document.querySelectorAll('.schedule-checkbox').forEach(checkbox => {
                //若狀態改變時，根據checkbox的data-index屬性值更新selectedSchedules數組，以新增或刪除行程
                checkbox.addEventListener('change', () => {
                    //以checkbox是否被選中（checkbox.checked）來更新selectedSchedules陣列
                    const index = parseInt(checkbox.getAttribute('data-index'), 10);
                    if (checkbox.checked) {
                        selectedSchedules.push(index);
                    } else {
                        selectedSchedules = selectedSchedules.filter(i => i !== index);
                    }
                });
            });
        }


        //0726
        //動感控制按鈕顯示
            //檢查'filteredSchedules'的班表數量是否大於0

        //若大於0(有班表)，迭代'filteredSchedules'，創建並顯示每個班表項目
            //迭代是指對集合中的每個元素執行相同的操作，直到達到特定條件或處理完所有項目（通常會使用迴圈來實現）
        if (filteredSchedules.length > 0) {

            // 顯示班表（好像是錯的code）
            //使用'forEach'方法對'filterSchedules'陣列中的每個班表項目執行'{...}'中的函數
            // filteredSchedules.forEach(schedule => {
            //     //創建一個新的'div'元素 —— 這元素將用來顯示單個班表項目的信息
            //     const scheduleElement = document.createElement('div');
            //     //設置'div'的'className'為'schedule-item' － 用作添加樣式或標識這些元素
            //     scheduleElement.className = 'schedule-item';
            //     //新增要呈現的資料樣式
            //         //將'schedule[3]'(出發時間:)、'schedule[4]'(到站時間:)、'schedule[5]'(班次種類:)插入'div'內部HTML中
            //     scheduleElement.innerHTML = `
            //         出發時間: ${schedule[3]} - 到站時間: ${schedule[4]} - 班次種類: ${schedule[5]}
            //     `;
            //     //將上面填充好的'div'添加('appendChild')到'scheduleContainer'中
            //     scheduleContainer.appendChild(scheduleElement);
            // });

            // 將「儲存變更」和「開始排班」按鈕，使用'classList.remove('d-none')'移除HTML中的'd-none'，顯示'save-changes'按鈕
            //document.getElementById('save-changes').classList.remove('d-none'); //0806註解
            document.getElementById('start-schedule').classList.remove('d-none');

        //若小於0(沒有班表)，添加d-none，隱藏'save-changes'按鈕
        } else {
            // 隱藏「儲存變更」、「開始排班」按鈕
            //document.getElementById('save-changes').classList.add('d-none'); //0806註解
            document.getElementById('start-schedule').classList.add('d-none');
        }

    }



//計算勤務時間//
    //計算'startExcelTime'與'endExcelTime'的時間差
    function calculateDutyTimeInMinutes(startExcelTime, endExcelTime) {
        //將'startMinutes'與'endMinutes'轉換為分鐘
        const startMinutes = Math.round(startExcelTime * 24 * 60);
        const endMinutes = Math.round(endExcelTime * 24 * 60);

        //使用'endMinutes - startMinutes'計算分鐘差
        return endMinutes - startMinutes;
    }



//編輯班次//
    //根據'duty_id'查找相應的班次資料，並更新界面上的輸入欄位和顯示標題
    function editSchedule(duty_id) {

        //使用'find'這個陣列方法，在'schedules'陣列中查找符合'duty_id'的班次
            //schedule'代表'schedules'陣列中每一個班次資料
            //'schedule[0]'是班次資料中的第一個元素（例如班次ID）
            //'duty_id'是要查找的班次ID
        //'schedule[0] === duty_id'：檢查'schedule'陣列中的第一個元素是否等於'duty_id'
        //若true，則用'find'的方法回傳'schedule'元素，否則繼續找下一個元素
        const schedule = schedules.find(schedule => schedule[0] === duty_id);
        //0808 API 取代上面的寫法 : const currSchedule = schedules.find(data => data.id === duty_id)

        //檢查是否找到符合條件的班次資料
        if (schedule) {
            //將'schedule'中的開始時間[3]轉換成標準時間格式，並設置到'startTimeInput'的輸入欄位中
            startTimeInput.value = convertExcelTime(schedule[3]);
            //0808 API 取代上面的寫法 : startTimeInput.value = convertExcelTime(schedule.start_time);

            //將'schedule'中的開始時間[4]轉換成標準時間格式，並設置到'endTimeInput'的輸入欄位中
            endTimeInput.value = convertExcelTime(schedule[4]);

            //'dayTypeSelect.value'：將下方的運算符結果設置在'dayTypeSelect'的值裡
            dayTypeSelect.value = schedule[5] === 1 ? 'holiday' : 'workday'; //0808

            //更新modal的標題為'編輯班次'
            addEditTitle.textContent = '編輯班次';

            //顯示modal
            addEditModal.show();

            //讓系統能夠「識別」與「追蹤」當前正在編輯的班次
            //將變數'editingScheduleIndex'設置為「當前正在編輯的班次ID」('duty_id')
                //index：是指在數組或列表中的位置
                //'editingScheduleIndex'用作儲存當前正在編輯的班次ID，以便讓系統知道用戶正在編輯哪個班次
                    //當用戶點擊編輯按鈕或觸發編輯操作時，'duty_id'被傳遞到'editSchedule'函數
                    //函數內部將'editingScheduleIndex'設置為'3'(假設)
                    //當用戶完成編輯並保存更改時，系統可以使用'editingScheduleIndex（即3）'來找到並更新對應的班次記錄
            editingScheduleIndex = duty_id;

        }

    }



//新增班次//
    //定義'addSchedule'函數，用作在用戶界面打開一個modal，以添加新的班次
    function addSchedule() {

        //清空'startTimeInput.value'
        startTimeInput.value = '';

        //清空'endTimeInput.value'
        endTimeInput.value = '';

        //將'dayTypeSelect'預設值設為'workday'
        dayTypeSelect.value = 'workday';

        //將modal的標題設置為'新增班次'
        addEditTitle.textContent = '新增班次';

        //顯示'addEditModal'（這是在HTML上新增的元件）
        addEditModal.show();

        //將'editingScheduleIndex'設置為'null'，讓系統知道目前不是在編輯，而是在新增班次
        editingScheduleIndex = null;


    }


//刪除班次//
    //'deleteSchedule'這個函數被調用時，會顯示'confirmDeleteModal'
    function deleteSchedule() {
        //顯示'confirmDeleteModal'（它是BS5的樣式）
        confirmDeleteModal.show();

    }



//確認刪除班次//
    //'confirmDelete'的函數：當用戶「確認刪除」操作時被調用
    function confirmDelete() {
        // const action = {
        //     type: 'delete',
        //     schedules: selectedSchedules.map(index => ({ index, schedule: [...schedules[index]] }))
        // };

        // // undoStack.push(action);
        // // redoStack = [];

        // selectedSchedules.sort((a, b) => b - a).forEach(index => {
        //     schedules.splice(index, 1);
        //     editedSchedules.delete(index);
        // });

        //'selectSchedules'是一個「包含選中班次的陣列」
        //使用'forEach'方法對'duty_id'執行後續操作
        selectedSchedules.forEach(duty_id => {

            //用來檢查'schedules'陣列中是否存在具有特定'duty_id'的班次
            //以'findIndex'方法查找'schedules'陣列中相對應的班次索引
                //'schedules'：包含所有班次的陣列
                //'findIndex'：是JavaScript的陣列方法，用作找出第一個符合測試函數條件的元素索引
            const scheduleIndex = schedules.findIndex(schedule => schedule[0] === duty_id);
            
            //若找到相對應的班次('scheduleIndex !== -1')，並分別從'schedules'與'editedSchedules'中移除
            //代表用戶正在刪除班次
            if (scheduleIndex !== -1) {

                //使用'splice'的方法，從'schedules'中刪除該班次
                schedules.splice(scheduleIndex, 1);

                //使用'delete的方法，'從'editSchedules'中刪除相對應的'duty_id'
                    //要從'editSchedules'刪除是因為操作'confirmDelete'時，需確保所刪除之班次數據來源一致
                        //schedules：包含所有班次的主要列表。當用戶確認刪除一個班次時，必須從這個列表中移除該班次。
                        //editedSchedules：通常是一個用來追踪用戶已經編輯過的班次的集合。它可能用來臨時保存編輯中的數據，或者標記哪些班次已經被用戶修改過。
                editedSchedules.delete(duty_id);


            }
        });

        //在刪除操作完成後，清空'selectSchedules'陣列
        selectedSchedules = [];

        //調用'displaySchedules'函數來「重新渲染」，並顯示'all'「所有班次」
            //'displaySchedules'函數的作用是重新渲染，並顯示所有班次
            //參數'all'表示顯示全部班次
        displaySchedules('all');

        //隱藏'confirmDeleteModal'
        confirmDeleteModal.hide();
    }



//儲存班次//
    function saveSchedule() {

        //創建新的班次對象
            //'newSchedule'用作儲存班次所有的數據，因此使用陣列的方式可以較為輕鬆地進行後續操作
        const newSchedule = [
        //下方為'newSchedule'的陣列內容

            //檢查'editingScheduleIndex'是否為'null'
                //若條件為true('editingScheduleIndex'!== null)，則使用'editingScheduleIndex'作為班次ID
                    //因為若不為null，代表目前正在編輯的班次是「現有班次」，所以應使用現有的班次ID
                //若條件為false('editingScheduleIndex' == null，則調用'generateNewDutyId()'函數生成一個新的ID)
                    //因為若為null，代表目前正在編輯的班次是「新的班次」，所以需要生成一個新的班次ID給它
            editingScheduleIndex !== null ? editingScheduleIndex : generateNewDutyId(),
            
            //用作獲取用戶在界面上所選擇的路線('routeSelect')的'value'
            routeSelect.value,

            //這是一個用作佔位的空字符串
            //這是此陣列中的第三個位置，這樣表示此位置目前不使用或未被填充
            '',

            //將用戶在'startTimeInput'與'endTimeInput'中輸入的時間轉換成excel時間格式
            parseTimeToExcel(startTimeInput.value),
            parseTimeToExcel(endTimeInput.value),

            //檢查用戶是否選擇了'holiday'，若是結果會是'1'；反之會是'0'
            dayTypeSelect.value === 'holiday' ? 1 : 0
        ];

        //0808 API 取代上方code
        // const newSchedule = {
        //     // id : editingScheduleIndex !== null ? editingScheduleIndex : generateNewDutyId(),
        //     route_id : routeSelect.value,
        //     start_time : parseTimeToExcel(startTimeInput.value),
        //     end_time : parseTimeToExcel(endTimeInput.value),
        //     holiday : dayTypeSelect.value === 'holiday' ? 1 : 0,
        //     station : 'zn'
        // }

        //用作檢查'schedules'是否與'editingScheduleIndex'一樣
            //檢查'editingScheduleIndex'是否為null' ： 指「編輯班次的意思」
        if (editingScheduleIndex !== null) {

            //0808 下方會改成呼叫API的方式：呼叫editAPI，再來判斷回傳的資料是否成功，若是成功會顯示編輯成功的訊息給user，再重新呼叫所有資料的API，再根據當前的條件顯示對應的資料。
            
            //以'findIndex'來查找'schedules'陣列中每個班次，直到找到'schedule[0]'為止
                //'schedule[0] === editingScheduleIndex'：檢查當前班次ID是否等於'editingScheduleIndex'
                //若找到符合條件的班次，'findIndex'會回傳該班次在'schedules'陣列中的索引位置
                //若找不到，則回傳'-1'
            const scheduleIndex = schedules.findIndex(schedule => schedule[0] === editingScheduleIndex);
            

            const result = {
                // ... 
            }


            //0807 註解
            //尋找該筆資料所有的資訊
            // const originalScheduleIndex = schedules.find(schedule => schedule[0] === editingScheduleIndex);

            //目的是根據'editingScheduleIndex'是否為'null'來決定要「更新班次」還是「新增班次」
                //若找到'scheduleIndex'不是'-1'，代表在陣列中找到符合的'editingScheduleIndex'，代表正在編輯一個現有的班次
                //代表用戶正在編輯班次
            if (scheduleIndex !== -1) {

                
                //那就使用'newSchedule'來更新'schedules'陣列中對應位置的班次
                    //'scheduleIndex'：指找到的班次索引位置
                    //'newSchedule'：指新的班次數據
                schedules[scheduleIndex] = newSchedule;

                //將'editingScheduleIndex'加入('add')'editedSchedules'集合中
                    //此集合用作追蹤哪些班次被編輯過
                editedSchedules.add(editingScheduleIndex);
                
            }
        //若'scheduleIndex == 1'，指「新增班次的意思」
        //代表用戶正在新增班次
        } else {

            //0808 下方的code會改成呼叫API的方式：呼叫insertAPI，再來判斷回傳的資料是否成功，若是成功會顯示新增成功的訊息給user，再重新呼叫所有資料的API，再根據當前的條件顯示對應的資料。

            //將新的班次'newSchedule'加進('push')'schedules'陣列中
            schedules.push(newSchedule);

            //將新班次的ID('newSchedule[0]')加進('add')'editedSchedules'集合中
                //這可以追蹤哪些班次是新的
            // editedSchedules.add(newSchedule[0]);
            editedSchedules.add({
                action: 'add',
                index: newSchedule[0]
            })


        }
        //Conclusion//
        //編輯模式：
            //如果找到了現有班次（scheduleIndex !== -1），則更新該班次的信息。
            //更新後將 editingScheduleIndex 添加到 editedSchedules 集合中，以標記這個班次已被編輯過。
        //新增模式：
            //如果找不到現有班次（scheduleIndex === -1），則將新班次添加到 schedules 陣列中。
            //將新班次的 ID 添加到 editedSchedules 集合中，以標記這是新增的班次。

        //在儲存新班次或更新現有班次後，確保界面顯示最新的班次數據
            //'displaySchedules'：根據給的參數來過濾和顯示班次列表
            //'all'：表示顯示所有班次
        displaySchedules('all');

        //在用戶儲存班次後，隱藏modal
        addEditModal.hide();

        //重置'editingScheduleIndex'，表示不再處於編輯某特定班次的狀態下
            //'editingScheduleIndex'：用作儲存當前正在編輯的班次ID
            //'null'：表示不再有任何班次處於編輯狀態
        editingScheduleIndex = null;

        //將'selectedSchedules'陣列清空，以免抓錯東西
        selectedSchedules = [];

    }



//生成新的'duty_id'
    //它會是目前'schedules'陣列中所有'duty_id'中的最大值＋1，以確保新生成的'duty_id'是唯一且遞增的
    function generateNewDutyId() {
        
        //'...schedules.map(schedule => schedule[0])'：
            //'...'：展開運算符：會將陣列中的元素展開為獨立的參數
            //'map'：此函數會翻遍'schedules'，對每個'schedule'執行一個「回調函數」
            //'schedule=>schedule[0]：這個回調函數會回傳每個'schedule'的第一個元素(即'duty_id')
                //假設：'schedule'是[101,...],[102,...],[103,...]，那就會回傳[101,102,103]

            //'Math.max'：此函數會回傳給定一組數字中的最大值（如上例，會回傳'103'）
                //若'+1'，則會回傳最大值再加一（如上例，會回傳'104'）
        return Math.max(...schedules.map(schedule => schedule[0])) + 1;
            //更詳細的寫法：
                // const dutyIds = schedules.map(function(schedule){
                //     return schedule[0];
                // });
                // const maxDutyId = Math.max.apply(null,dutyIds);
                // return maxDutyId +1;
    }



     // 0730：為 "開始排班" 按鈕添加事件監聽器
    startScheduleButton.addEventListener('click', function() {
         // 執行開始排班的相關邏輯
        startScheduling();
    });

    //0730：開始排班的功能
    function startScheduling(){
        // 在這裡添加你需要的功能邏輯
        alert('開始排班功能尚未實現');
        // 例如，顯示一個模態框，或跳轉到新的頁面
    }


//監聽按鈕功能//
    //新增班次的按鈕
    addScheduleButton.addEventListener('click', addSchedule);
    //儲存班次的按鈕
    saveScheduleButton.addEventListener('click', saveSchedule);
    //刪除班次的按鈕
    deleteScheduleButton.addEventListener('click', deleteSchedule);
    //確認刪除的按鈕
    confirmDeleteButton.addEventListener('click', confirmDelete);
});