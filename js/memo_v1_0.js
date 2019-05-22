var TMON = TMON || {}; // Namespace 등록

// IIFE 를 통한 캡슐화 및 공개 함수 등록
TMON.MEMO = (() => {

    let id_local_storage = "tmon_memo_stack_key";
    let color_set = [ "#2E86C1", "#EC7063", "#F9E79F", "#ABEBC6", "#E5E7E9" ]; // 랜덤 색상 및 색상 선택 목록
    let container = "container";
    let el_container; // 메모가 생성되는 최상단 Container Element
    let prev_x = 0; // 드래그 직전 마우스의 X 좌표
    let prev_y = 0; // 드래그 직전 마우스의 Y 좌표
    let max_memo_num = 50; // 메모의 최대 생성 수
    let keyup_delay = 500; // 메모에 텍스트 입력시 사용자가 타이핑을 멈추길 기다림
    let random_color = false; // 메모를 생성시 바탕화면을 랜덤하게 설정. 기본값 false
    let text_area_width = 200; // 메모의 text_area width 기본값
    let text_area_height = 100; // 메모의 text_area height 기본값

    /**
     * localStorage 에서 등록된 메모를 불러와 화면에 출력
     * 저장된 메모가 없을 경우 하나 생성
     * 
     * @Parameters
     * opt = {
     *  container : ID_OF_CONTAINER_ELEMENTS,
     *  buttons : Boolean, 
     *  random_color : Boolean 
     * }
     */
    function init( opt ) {

        console.log( `### Initialize Memo` );
        
        if ( opt && opt.container ) {
            
            // debugger;
            container = opt.container;
            el_container = document.querySelector( `#${container}` );

            if ( !el_container ) {
                console.log( `${opt.container} 가 없습니다. 새로운 컨테이너를 #${container} 로 생성합니다.` );
                // 새로운 container 생성
                createNewContainer();
            } else {
                initContainer( el_container );
            }
        }

        if ( opt && opt.random_color ) {
            random_color = true;
        }

        if ( opt && opt.buttons ) {
            enableButtons();
        }

        let memo_stack = getMemoStack();
        
        if ( memo_stack && memo_stack.length > 0 ) {
            memo_stack.forEach( memo => {
                createAMemo( memo );
            });
        } else {
            createAMemo( getMemoInfoDefault() );
            saveStatus();
        }
    }

    /**
     * Init Container
     */
    function initContainer( container ) {
        container.addEventListener( "drop", evt => drop( evt ) );
        container.addEventListener( "dragover", evt => allowDrop( evt ) );
        container.addEventListener( "click", evt => newMemo( evt ) );
    }

    /**
     * Container 가 없거나 id 값이 잘못된 경욷 등. 새로운 Container 를 생성한다.
     * <div class="wrap" id="container" ondrop="memo.drop( event )" ondragover="memo.allowDrop( event )" onclick="memo.newMemo( event )"></div>
     */
    function createNewContainer() {

        let memo_container = document.createElement( "div" );
            memo_container.className = "wrap";
            memo_container.id = "container";
            memo_container.addEventListener( "drop", evt => drop( evt ) );
            memo_container.addEventListener( "dragover", evt => allowDrop( evt ) );
            memo_container.addEventListener( "click", evt => newMemo( evt ) );

        // Hide Other Container
        document.querySelectorAll( ".wrap" ).forEach( el => el.style.display = "none" );
        
        document.querySelector( `body` ).appendChild( memo_container );
        el_container = memo_container;
    }

    /**
     * Init 시 Option 값으로 button 의 활성화 여부 파악. 동적으로 생성.
     * <button class="btn_normal" id="btn_clear" onclick="memo.clearMemo()">CLEAR</button>
            <button class="btn_normal" id="btn_sort" onclick="memo.sortMemo()">SORT</button>
     */
    function enableButtons() {
        let button_container = document.createElement( "div" );
            button_container.className = "btn_container";

        let btn_clear = document.createElement( "input" );
            btn_clear.className = "btn_normal";
            btn_clear.id = "btn_clear";
            btn_clear.type = "button";
            btn_clear.value = "CLEAR";
            btn_clear.addEventListener( "click", clearMemo );

        let btn_sort = document.createElement( "input" );
            btn_sort.className = "btn_normal";
            btn_sort.id = "btn_sort";
            btn_sort.type = "button";
            btn_sort.value = "SORT";
            btn_sort.addEventListener( "click", sortMemo );
        
        button_container.appendChild( btn_clear );
        button_container.appendChild( btn_sort );
        el_container.appendChild( button_container );
    }

    /**
     * 메모의 디폴트 정보를 리턴
     */
    function getMemoInfoDefault() {
        let memo_info = { 
            idx : 1, 
            id : "memo_1",
            text : "### First Memo ###",
            style : {
                width : 200,
                height : 100,
                pos_x : 10,
                pos_y : 10,
                z_index : 1,
                background : "lightyellow"
            }
        };
        return memo_info;
    }

    /**
     * 메모 Element 에서 필요한 값을을 추출하여 리턴한다.
     */
    function getMemoInfo( memo ) {
        try {
            let text_area = memo.querySelector( "#text_area" );
            let memo_info = {
                idx : parseInt( memo.id.replace( "memo_", "" ) ),
                id : memo.id,
                text : memo.querySelector( "#text_area" ).innerText ? memo.querySelector( "#text_area" ).innerText : "",
                style : {
                    width : text_area.offsetWidth,
                    height : text_area.offsetHeight,
                    pos_x : parseInt( memo.style.left ),
                    pos_y : parseInt( memo.style.top ),
                    z_index : parseInt( memo.style.zIndex ),
                    background : memo.style.background
                }
            };
            return memo_info;
        } catch ( err ) {
            console.log( `${memo.id} 에서 필요한 값을을 가져오는데 실패했습니다.` );
            return getMemoInfoDefault();
        }
    }

    /**
     * localStorage 에 저장된 메모 목록을 불러온다
     */
    function getMemoStack() {
        let memo_stack = localStorage.getItem( id_local_storage );
            memo_stack = memo_stack ? JSON.parse( memo_stack ) : [];
        return memo_stack;
    }

    /**
     * 현재 화면에 존재하는 모든 메모의 상태를 localStorage 에 저장한다.
     * 최종적으로 DB 나 파일에 저장하는 옵션도 고려할 수 있을 듯.
     */
    function saveStatus() {
        let memo_stack = [];
        document.querySelectorAll( ".memo" ).forEach( memo => memo_stack.push( getMemoInfo( memo ) ));
        localStorage.setItem( id_local_storage, JSON.stringify( memo_stack ) );
    }
    
    /**
     * 
     */
   function getMemoTemplate( memo_info ) {

        // debugger;
        // Memo Outer
        let memo = document.createElement( "div" );
            memo.className = "memo";
            memo.id = memo_info.id;
            memo.draggable = true;
            memo.addEventListener( "dragstart", evt => drag( evt ) );

            // Memo 의 style 설정
            memo.style.top = `${memo_info.style.pos_y}px`;
            memo.style.left = `${memo_info.style.pos_x}px`;
            memo.style.zIndex = `${memo_info.style.z_index}`;
            memo.style.background = `${memo_info.style.background}`;

        // Header
        let header = document.createElement( "div" );
            header.className = "header";

        // <h1 class="blind">메모장</h1>
        let header_label = document.createElement( "h1" );
            header_label.className = "blind";
            header.appendChild( header_label );

        // Button Color Change
        let btn_color_change = document.createElement( "button" );
            btn_color_change.className = "btn_color_change";
            btn_color_change.addEventListener( "click", evt => colorChanger( evt ) );
        let btn_color_change_label = document.createElement( "span" );
            btn_color_change_label.className = "color_change";
            btn_color_change_label.label = "색상변경";
            btn_color_change.appendChild( btn_color_change_label );

        // Button Close
        let btn_close = document.createElement( "button" );
            btn_close.className = "btn_close";
            btn_close.addEventListener( "click", evt => deleteMemo( evt ) );
        let btn_close_label = document.createElement( "span" );
            btn_close_label.className = "blind";
            btn_close_label.label = "닫기";
            btn_close.appendChild( btn_close_label );

            header.appendChild( btn_color_change );
            header.appendChild( btn_close );

        // Content
        let content = document.createElement( "div" );
            content.className = "content";
        let content_textarea = document.createElement( "div" );
            content_textarea.className = "textarea";
            content_textarea.id = "text_area";
            content_textarea.contentEditable = true;
            content_textarea.spellcheck = false;
            content_textarea.addEventListener( "keyup", evt => saveContents( evt ) );
            content_textarea.addEventListener( "click", evt => getFocused( evt.target.parentElement.parentElement.id ) );
            
            // Memo 의 textarea 부분 설정
            content_textarea.innerText = memo_info.text;
            content_textarea.style.width = memo_info.style.width + "px";
            content_textarea.style.height = memo_info.style.height + "px";

        // Make A Memo
        content.appendChild( content_textarea );

        

        memo.appendChild( header );
        memo.appendChild( content );

        return memo;
   }

   function createAMemo( memo_info ) {
        let memo_template = getMemoTemplate( memo_info );
        el_container.appendChild( memo_template );
   }

    /**
     * 새로운 메모를 생성한다
     */
    function createAMemo2( memo_info ) {
        // Memo Template
        let memo_template = document.querySelector( "#memo_template" );

        // 자식 노드를 포함한 Memo template 의 새로운 Element 를 생성
        let memo = document.importNode( memo_template.content.children[ 0 ], true );
            memo.id = memo_info.id;

        // Memo 의 style 설정
        memo.style.top = `${memo_info.style.pos_y}px`;
        memo.style.left = `${memo_info.style.pos_x}px`;
        memo.style.zIndex = `${memo_info.style.z_index}`;
        memo.style.background = `${memo_info.style.background}`;
        
        // Memo 의 textarea 부분 설정
        let text_area = memo.querySelector( "#text_area" );
            text_area.innerText = memo_info.text;
            text_area.style.width = memo_info.style.width + "px";
            text_area.style.height = memo_info.style.height + "px";
        
        // 메모를 추가할 최상단 Div 에 메모를 추가
        el_container.appendChild( memo );
    }
    
    /**
     * 마우스의 드래그 전 위치를 가져온다.
     * 마우스 드래그 이벤트는 메모 내 모든 영영에 걸려있기 때문에 메모가 마우스가 이동한 거리만큼만 이동하기 위함.
     * 메모의 드래그 후 위치 = 메모의 드래그 전 위치 + 마우스가 이동한 거리
     */
    function getStartPoint( evt ) {
        prev_x = evt.clientX;
        prev_y = evt.clientY;
    }
    
    /**
     * 드래그 시 다른 Event 와의 중첩을 방지
     */
    function allowDrop( evt ) {
        evt.preventDefault();
    }
    
    /**
     * drap 시 마우스의 시작포인터를 가져오고 선택된 메모를 가져옴
     */
    function drag( evt ) {
        getStartPoint( evt );
        evt.dataTransfer.setData( "text/plain", evt.target.id );
    }
    
    /**
     * 드래그 후 마우스 버튼을 해제했을 때의 동작
     */
    function drop( evt ) {
        
        evt.preventDefault();

        let data = evt.dataTransfer.getData( "text/plain" );
            evt.dataTransfer.dropEffect = "move"
        let memo = document.getElementById( data );
        
        let current_x = parseInt( memo.style.left );
        let current_y = parseInt( memo.style.top );
        let pos_x = evt.clientX;
        let pos_y = evt.clientY;
        
        // 메모의 최종 위치
        let move_x = current_x + ( pos_x - prev_x );
        let move_y = current_y + ( pos_y - prev_y );
    
        memo.style.top =  move_y + "px";
        memo.style.left = move_x + "px";
        
        // 메모를 최상단으로 가져온다.
        getFocused( data );
    }
    
    /**
     * 새로운 메모를 생성한다. Container 의 회색 바탕화면을 클릭했을 때 호출
     */
    function newMemo( evt ) {
        
        // Container 이외의 부분을 클릭했을 때는 return 
        if ( evt.target.id != container ) {
            return false;
        }
    
        let memo_stack = getMemoStack();

        // 메모의 최대 생성 Validation
        if ( memo_stack.length >= max_memo_num ) {
            let msg = `메모는 ${max_memo_num}개 까지만 생성할 수 있습니다.`;
            alert( msg );
            return false;
        }
        
        // 마지막으로 생성된 메모의 정보
        let last_memo = memo_stack[ memo_stack.length - 1 ];
        let id = last_memo ? last_memo.idx + 1 : 0;
        
        let memo_info = {
            idx : last_memo ? last_memo.idx + 1 : 1,
            id : id,
            text : "",
            style : {
                width : text_area_width,
                height : text_area_height,
                pos_x : evt.clientX,
                pos_y : evt.clientY,
                z_index : id,
                background : ""
            }
        };
        
        // Options 에서 random_color 의 값이 true 일 경우 메모를 생성할 때 color_set 에 있는 값을 랜덤으로 설정
        if ( random_color ) {
            let color_rand_idx = parseInt( Math.random() * 5 );
            memo_info.style.background = color_set[ color_rand_idx ];
        } else {
            memo_info.style.background = "lightyellow";
        }

        let memo = getMemoTemplate( memo_info );
        el_container.appendChild( memo );
        
        saveStatus();
    }
    
    var delay = (function() {
        var timer = 0;
        return function( callback, ms ) {
            clearTimeout( timer );
            timer = setTimeout( callback, ms );
        };
    })();
    
    /**
     * 메모의 onkeyup 이벤트 발생 시 사용자가 입력을 중단할때 까지 기다린 후 상태값을 저장
     * 함수가 호출 될 때마다 timeout 을 초기화. 호출되지 않을 경우에는 keyup_delay 이후에 상태값을 저장
     */
    function saveContents( evt ) {
        delay( saveStatus, keyup_delay );
    }
    
    /**
     * 화면 상의 모든 메모를 제거
     */
    function clearMemo() {
        let msg = "모든 메세지를 삭제하시겠습니까?";
        if ( !confirm( msg ) ) {
            return false;
        }

        document.querySelectorAll( ".memo" ).forEach( memo => memo.remove() );
        saveStatus();
    }
    
    /**
     * 화면상의 모든 메모를 좌측 상단 부터 정렬한다.
     * 정렬 시 모든 메모의 사이즈는 기본값으로 초기화 됨.
     */
    function sortMemo() {
    
        let msg = "메모의 사이즈가 초기화 됩니다. 정렬하시겠습니까?";
        if ( !confirm( msg ) ) {
            return;
        }
    
        let screenHeight = document.body.scrollHeight;
        let width = text_area_width + 20;
        let height = text_area_height + 36;
        let left = 0;
        let idx = 0;
        document.querySelectorAll( ".memo" ).forEach( memo => {
            
            // 정렬을 위해 text_area 의 값을 기본값으로 초기화
            let text_area = memo.querySelector( "#text_area" );
            text_area.style.width = text_area_width + "px";
            text_area.style.height = text_area_height + "px";
            
            // 한행에 놓이는 메모가 container 의 height 를 넘어갈 경우 다름 라인에 정렬
            if ( ( height * idx + height ) >= screenHeight ) {
                left += width;
                idx = 0;
            }
    
            memo.style.top = ( height * idx ) + "px";
            memo.style.left =  left + "px";
    
            idx++;
        });
    
        saveStatus();
    }
    
    /**
     * 선택한 메모를 제거
     */
    function deleteMemo( evt ) {
        evt.target.parentElement.parentElement.remove();
        saveStatus();
    }
    
    /**
     * 선택한 메모의 색상을 변경하는 레이어를 띄운다.
     */
    function colorChanger( evt ) {

        if ( document.querySelector( ".color_changer_container" ) ) {
            document.querySelectorAll( ".color_changer_container" ).forEach( el => el.remove() );
            return false;
        }

        let color_container = document.createElement( "div" );
            color_container.className = "color_changer_container";
            color_container.style.zIndex = "10000";
        color_set.forEach( color => {
            let c = document.createElement( "div" );
                c.style.width = "20px";
                c.style.height = "20px";
                c.style.background = color;
                c.style.display = "inline-block";
                c.style.cursor = "pointer";
                c.addEventListener( "click", evt => {
                    let memo = evt.target.parentElement.parentElement.parentElement.parentElement;
                    memo.style.background = evt.target.style.background;
                    saveStatus();
                });
            color_container.appendChild( c );
        });
        
        evt.target.appendChild( color_container );
    }

    /**
     * 백그라운드에 있는 메모를 최상위로 올린다.
     * 선택된 메모의 z-index 를 9999 로 설정해주고 나머지 메모들의 값을 id값(number sequence) 으로 설정해준다.
     */
    function getFocused( memo_id ) {
        document.querySelectorAll( ".memo" ).forEach( ( el, idx ) => {
            if ( el.id === memo_id )
                el.style.zIndex = `9999`;
            else    
                el.style.zIndex = `${idx}`;
        });
    
        saveStatus();
    }

    // 공개함수만 등록
    let o = {
        init,
        clearMemo,
        sortMemo
    };

    return o;
    
})();