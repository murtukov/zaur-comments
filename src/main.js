"use strict";
class App {
    constructor(users) {
        this.comments = {};
        this.lastCommentId = 0;
        // Find all HTML elements
        this.elements = {
            input: document.getElementById('comment-input'),
            form: document.getElementById('comment-form'),
            button: document.querySelector('#comment-form button'),
            commentsContainer: document.getElementById('comments-container'),
            counter: document.getElementById('counter'),
            userName: document.querySelector('.user-name'),
            avatar: document.querySelector('.avatar')
        };
        this.users = users;
        // Load data from LocalStorage
        this.load();
        this.currentUser = users[0];
        this.renderUserList();
        this.renderComments();
        this.elements.input.oninput = (e) => {
            const el = e.currentTarget;
            // Disable/enable button
            if (el.value.length > 0) {
                this.elements.button.removeAttribute('disabled');
            }
            else {
                this.elements.button.setAttribute('disabled', 'on');
            }
            this.elements.counter.innerText = `${el.value.length}/1000`;
        };
        this.elements.form.onsubmit = (e) => {
            e.preventDefault();
            const newComment = new Commentary(this.elements.input.value, this.currentUser, this);
            this.comments[newComment.id] = newComment;
            const commentElement = newComment.getHTMLElement();
            this.elements.input.value = '';
            this.elements.button.setAttribute('disabled', '');
            this.elements.commentsContainer.appendChild(commentElement);
            this.persist();
        };
    }
    renderUserList() {
        const userList = document.getElementById('user-list');
        userList.innerHTML = '';
        for (const [key, user] of Object.entries(this.users)) {
            const userElement = createElementFromString(`
        <div class="user ${user.id === this.currentUser.id ? 'active' : ''}" data-user-id="${user.id}">
            <img src="./images/${user.avatar}" width="30" height="30">
            <span>${user.name}</span>
        </div>
      `);
            userElement.onclick = () => {
                this.currentUser = user;
                this.elements.userName.innerText = user.name;
                this.elements.avatar.setAttribute('src', `./images/${user.avatar}`);
                this.renderUserList();
                this.persist();
            };
            userList.appendChild(userElement);
        }
        this.elements.userName.innerText = this.currentUser.name;
        this.elements.avatar.setAttribute('src', `./images/${this.currentUser.avatar}`);
    }
    renderComments() {
        for (const comment of Object.values(this.comments)) {
            const el = comment.getHTMLElement();
            this.elements.commentsContainer.appendChild(el);
        }
    }
    persist() {
        const commentsData = [];
        // Collect all comments' data
        for (const [key, comment] of Object.entries(this.comments)) {
            commentsData.push(comment.getData());
        }
        localStorage.setItem('comment_app', JSON.stringify({
            comments: commentsData,
            currentUser: this.currentUser.id,
            lastCommentId: this.lastCommentId
        }));
    }
    load() {
        const stringData = localStorage.getItem('comment_app');
        if (!stringData)
            return;
        const localStorageData = JSON.parse(stringData);
        // Convert comments data into real Commentary objects
        for (const commentData of Object.values(localStorageData.comments)) {
            console.log('raw ==>', commentData);
            const commentary = new Commentary(
            // @ts-ignore
            commentData.text, 
            // @ts-ignore
            this.users[commentData.author], this, null);
            // @ts-ignore
            commentary.setFavorite(commentData.favorite);
            // @ts-ignore
            commentary.setLikes(commentData.likes);
            this.comments[commentary.id] = commentary;
        }
        // Set parents
        for (const commentData of Object.values(localStorageData.comments)) {
            // @ts-ignore
            if (commentData.parent) {
                // @ts-ignore
                this.comments[commentData.id].setParent(this.comments[commentData.parent]);
            }
        }
    }
}
class User {
    constructor(id, name, avatar) {
        this.id = id;
        this.name = name;
        this.avatar = avatar;
    }
    getData() {
        return {
            id: this.id,
            name: this.name,
            avatar: this.avatar
        };
    }
}
class Commentary {
    constructor(text, author, app, parent) {
        this.favorite = false;
        this.likes = 0;
        this.text = text;
        this.author = author;
        this.timestamp = new Date();
        this.parent = parent;
        this.app = app;
        this.id = app.lastCommentId++;
    }
    setFavorite(isFavorite) {
        this.favorite = isFavorite;
    }
    setLikes(likes) {
        this.likes = likes;
    }
    setParent(parent) {
        this.parent = parent;
    }
    getTemplate(isSubComment = false) {
        var _a;
        const date = this.timestamp.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit' });
        const time = this.timestamp.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        let respondee = '';
        if (isSubComment) {
            respondee = `
        <span class="respondee">
            <img src="./images/reply.svg">
            <span class="reply">${(_a = this.parent) === null || _a === void 0 ? void 0 : _a.author.name}</span>
        </span>
      `;
        }
        return `
      <div class="comment ${isSubComment ? 'sub-comment' : ''}">
          <div class="comment-intrinsic">
              <img class="avatar" alt="" src="./images/${this.author.avatar}">
              <div>
                  <div class="heading">
                      <span class="user-name">${this.author.name}</span>
                      ${respondee}
                      <span class="date">${date} ${time}</span>
                  </div>
                  <p>${this.text}</p>
                  <div class="actions">
                      <a href="#" class="action-respond">
                          <img alt="" src="./images/reply.svg">
                          <span class="reply">Ответить</span>
                      </a>
                      <a href="#" class="action-favorite">
                          <img alt="" src="./images/heart_unfilled.svg">
                          <span class="favorite">В избранноe</span>
                      </a>
                      <div class="minus">-</div>
                      <span class="likes-counter">${this.likes}</span>
                      <div class="plus">+</div>
                  </div>
              </div>
          </div>
        </div>
    `;
    }
    getHTMLElement(isSubComment = false) {
        const stringHtml = this.getTemplate(isSubComment);
        this.commentEl = createElementFromString(stringHtml);
        const replyButton = this.commentEl.querySelector('.reply');
        replyButton.onclick = this.handleReplyButtonPress.bind(this);
        const favoriteButton = this.commentEl.querySelector('.action-favorite');
        favoriteButton.onclick = (e) => {
            this.handleFavoriteClick(e);
        };
        const plusButton = this.commentEl.querySelector('.plus');
        const minusButton = this.commentEl.querySelector('.minus');
        minusButton.onclick = this.handleRatingClick.bind(this);
        plusButton.onclick = this.handleRatingClick.bind(this);
        return this.commentEl;
    }
    createReplyForm() {
        return createElementFromString(`
      <form id="sub-comment-form">
          <img alt="avatar" src="./images/${this.app.currentUser.avatar}" width="30" height="30"/>
          <input type="text" />
      </form>
    `);
    }
    handleReplyButtonPress() {
        const replyForm = this.createReplyForm();
        const input = replyForm.querySelector('input[type="text"]');
        replyForm.onsubmit = (e) => {
            const newComment = new Commentary(input.value, this.app.currentUser, this.app, this);
            this.app.comments[newComment.id] = newComment;
            const newCommentEl = newComment.getHTMLElement(true);
            replyForm.replaceWith(newCommentEl);
            this.app.persist();
        };
        this.commentEl.appendChild(replyForm);
    }
    handleRatingClick(e) {
        const target = e.currentTarget;
        const counterEl = this.commentEl.querySelector('.likes-counter');
        if (target.classList.contains('minus')) {
            counterEl.innerText = String(Number(counterEl.innerText) - 1);
        }
        else {
            counterEl.innerText = String(Number(counterEl.innerText) + 1);
        }
        this.likes = Number(counterEl.innerText);
        this.app.persist();
    }
    handleFavoriteClick(e) {
        const target = e.currentTarget;
        const image = target.querySelector('img');
        if (this.favorite) {
            image.setAttribute('src', `./images/heart_unfilled.svg`);
        }
        else {
            image.setAttribute('src', `./images/heart_filled.svg`);
        }
        this.favorite = !this.favorite;
        this.app.persist();
    }
    getData() {
        return {
            id: this.id,
            author: this.author.id,
            timestamp: this.timestamp.toString(),
            text: this.text,
            parent: this.parent ? this.parent.id : null,
            favorite: this.favorite,
            likes: this.likes
        };
    }
}
/**
 * Create HTML element from a string containing valid HTML code.
 */
function createElementFromString(htmlString) {
    const parser = new DOMParser();
    return parser.parseFromString(htmlString, "text/html").body.firstChild;
}
