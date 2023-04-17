"use strict";
class App {
    constructor(users) {
        this.comments = {};
        this.lastCommentId = 0;
        // Find all HTML elements
        this.elements = {
            avatar: document.querySelector('.avatar'),
            button: document.querySelector('#comment-form button'),
            commentsContainer: document.getElementById('comments-container'),
            counter: document.getElementById('counter'),
            form: document.getElementById('comment-form'),
            input: document.getElementById('comment-input'),
            purgeButton: document.getElementById('purge'),
            userName: document.querySelector('.user-name'),
        };
        this.users = users;
        this.currentUser = users[0];
        // Load data from LocalStorage
        this.load();
        this.renderUserList();
        this.renderAllComments();
        // Set initial handlers
        this.elements.input.oninput = this.handleInputChange.bind(this);
        this.elements.form.onsubmit = this.handleFormSubmit.bind(this);
        this.elements.purgeButton.onclick = this.purge;
    }
    handleInputChange(e) {
        const el = e.currentTarget;
        const { counter, button } = this.elements;
        if (el.value.length > 1000) {
            // Handle length validation
        }
        // Disable/enable button
        if (el.value.length > 0) {
            button.removeAttribute('disabled');
        }
        else {
            button.setAttribute('disabled', '');
        }
        counter.innerText = `${el.value.length}/1000`;
    }
    handleFormSubmit(e) {
        e.preventDefault();
        const { input, button, commentsContainer } = this.elements;
        const newComment = new Commentary({
            text: input.value,
            author: this.currentUser,
            app: this
        });
        this.comments[newComment.id] = newComment;
        const commentElement = newComment.getHTMLElement();
        input.value = '';
        button.setAttribute('disabled', '');
        commentsContainer.appendChild(commentElement);
        this.persist();
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
                this.handleUserSelect(user);
            };
            userList.appendChild(userElement);
        }
        this.elements.userName.innerText = this.currentUser.name;
        this.elements.avatar.setAttribute('src', `./images/${this.currentUser.avatar}`);
    }
    handleUserSelect(user) {
        this.currentUser = user;
        this.elements.userName.innerText = user.name;
        this.elements.avatar.setAttribute('src', `./images/${user.avatar}`);
        const subCommentForm = document.getElementById('sub-comment-form');
        if (subCommentForm) {
            subCommentForm.children[0].setAttribute('src', `./images/${user.avatar}`);
        }
        this.renderUserList();
        this.persist();
    }
    renderAllComments() {
        console.log(this.comments);
        for (const comment of Object.values(this.comments)) {
            if (comment.parent) {
                const el = comment.getHTMLElement(true);
                const parent = document.querySelector(`.comment[data-id="${comment.parent.id}"]`);
                parent.appendChild(el);
            }
            else {
                const el = comment.getHTMLElement();
                this.elements.commentsContainer.appendChild(el);
            }
        }
    }
    persist() {
        const commentsData = [];
        // Collect all comments' data
        for (const comment of Object.values(this.comments)) {
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
        const rawData = JSON.parse(stringData);
        // Convert comments data into real Commentary objects (without parents)
        for (const commentData of Object.values(rawData.comments)) {
            const commentary = new Commentary({
                text: commentData.text,
                author: this.users[commentData.author],
                app: this
            });
            commentary.setFavorite(commentData.favorite);
            commentary.setLikes(commentData.likes);
            this.comments[commentary.id] = commentary;
        }
        // Set parents
        for (const commentData of Object.values(rawData.comments)) {
            if (typeof commentData.parent === 'number') {
                this.comments[commentData.id].setParent(this.comments[commentData.parent]);
            }
        }
        // Set selected user
        this.currentUser = this.users[rawData.currentUser];
    }
    purge() {
        localStorage.clear();
        location.reload();
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
    constructor({ text, author, app, parent }) {
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
      <div class="comment ${isSubComment ? 'sub-comment' : ''}" data-id="${this.id}">
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
                          <img alt="" src="./images/heart_${this.favorite ? '' : 'un'}filled.svg">
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
        const plusButton = this.commentEl.querySelector('.plus');
        const minusButton = this.commentEl.querySelector('.minus');
        const favoriteButton = this.commentEl.querySelector('.action-favorite');
        minusButton.onclick = this.handleRatingClick.bind(this);
        plusButton.onclick = this.handleRatingClick.bind(this);
        replyButton.onclick = this.handleReplyButtonPress.bind(this);
        favoriteButton.onclick = (e) => {
            this.handleFavoriteClick(e);
        };
        return this.commentEl;
    }
    createReplyForm() {
        return createElementFromString(`
      <form id="sub-comment-form">
          <img alt="avatar" src="./images/${this.app.currentUser.avatar}" width="30" height="30"/>
          <input type="text" name="message" autofocus/>
      </form>
    `);
    }
    handleReplyButtonPress() {
        // Don't add the form multiple times
        if (this.commentEl.querySelector('#sub-comment-form'))
            return;
        const replyForm = this.createReplyForm();
        // @ts-ignore
        const input = replyForm.elements['message'];
        replyForm.onsubmit = () => {
            const newComment = new Commentary({
                text: input.value,
                author: this.app.currentUser,
                app: this.app,
                parent: this
            });
            this.app.comments[newComment.id] = newComment;
            const newCommentEl = newComment.getHTMLElement(true);
            replyForm.replaceWith(newCommentEl);
            this.app.persist();
        };
        this.commentEl.appendChild(replyForm);
        input.focus();
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
    /**
     * Prepare data for LocalStorage
     */
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
