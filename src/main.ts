type HTMLElements = {
  input: HTMLInputElement,
  form: HTMLFormElement,
  button: HTMLButtonElement,
  commentsContainer: HTMLDivElement,
  counter: HTMLSpanElement,
  userName: HTMLSpanElement,
  avatar: HTMLImageElement,
  purgeButton: HTMLImageElement
}

type CommentData = {
  id: number,
  author: number,
  timestamp: string,
  text: string,
  parent?: number | null,
  favorite: boolean,
  likes: number
}

type AppData = {
  comments: Array<CommentData>;
  currentUser: number;
}

class App {
  currentUser: User;
  users: {[key: number]: User};
  comments: {[key: number]: Commentary} = {};
  lastCommentId = 0;

  // Find all HTML elements
  elements: HTMLElements = {
    avatar:            document.querySelector('.avatar') as HTMLImageElement,
    button:            document.querySelector('#comment-form button') as HTMLButtonElement,
    commentsContainer: document.getElementById('comments-container') as HTMLDivElement,
    counter:           document.getElementById('counter') as HTMLSpanElement,
    form:              document.getElementById('comment-form') as HTMLFormElement,
    input:             document.getElementById('comment-input') as HTMLInputElement,
    purgeButton:       document.getElementById('purge') as HTMLImageElement,
    userName:          document.querySelector('.user-name') as HTMLSpanElement,
  };

  constructor(users: {[key: number]: User}) {
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

  handleInputChange(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    const {counter, button} = this.elements;

    if (el.value.length > 1000) {
      // Handle length validation
    }

    // Disable/enable button
    if (el.value.length > 0) {
      button.removeAttribute('disabled');
    } else {
      button.setAttribute('disabled', '');
    }

    counter.innerText = `${el.value.length}/1000`;
  }

  handleFormSubmit(e: SubmitEvent) {
    e.preventDefault();
    const {input, button, commentsContainer} = this.elements;

    const newComment = new Commentary({
      text: input.value,
      author: this.currentUser,
      app: this
    });

    this.comments[newComment.id] = newComment;
    const commentElement = newComment.getHTMLElement();

    input.value = '';
    button.setAttribute('disabled', '')
    commentsContainer.appendChild(commentElement);

    this.persist();
  }

  renderUserList() {
    const userList = document.getElementById('user-list')!;

    userList.innerHTML = '';

    for (const [key, user] of Object.entries(this.users)){
      const userElement = createElementFromString<HTMLDivElement>(`
        <div class="user ${user.id === this.currentUser.id ? 'active' : ''}" data-user-id="${user.id}">
            <img src="./images/${user.avatar}" width="30" height="30">
            <span>${user.name}</span>
        </div>
      `);

      userElement.onclick = () => {
        this.handleUserSelect(user)
      };

      userList.appendChild(userElement);
    }

    this.elements.userName.innerText = this.currentUser.name;
    this.elements.avatar.setAttribute('src', `./images/${this.currentUser.avatar}`);
  }

  handleUserSelect(user: User) {
    this.currentUser = user;
    this.elements.userName.innerText = user.name;
    this.elements.avatar.setAttribute('src', `./images/${user.avatar}`);

    const subCommentForm = document.getElementById('sub-comment-form');
    if (subCommentForm) {
      subCommentForm.children[0].setAttribute('src', `./images/${user.avatar}`)
    }

    this.renderUserList();
    this.persist();
  }

  renderAllComments() {
    for (const comment of Object.values(this.comments)) {
      if (comment.parent) {
        const el = comment.getHTMLElement(true);
        const parent = document.querySelector(`.comment[data-id="${comment.parent.id}"]`) as HTMLDivElement;
        parent.appendChild(el);
      } else {
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

    if (!stringData) return;

    const rawData: AppData = JSON.parse(stringData);

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
  id: number;
  name: string;
  avatar: string;

  constructor(id: number, name: string, avatar: string) {
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

type TCommentary = {
  text: string,
  author: User,
  app: App,
  parent?: Commentary | null
}

class Commentary {
  id: number;
  author: User;
  timestamp: Date;
  text: string;
  parent?: Commentary | null;
  favorite: boolean = false;
  likes: number = 0;
  // Link to the app instance
  app: App;
  // HTML representation of this comment
  commentEl?: HTMLDivElement;


  constructor({text, author, app, parent}: TCommentary) {
    this.text = text;
    this.author = author;
    this.timestamp = new Date();
    this.parent = parent;
    this.app = app;
    this.id = app.lastCommentId++;
  }

  public setFavorite(isFavorite: boolean) {
    this.favorite = isFavorite
  }

  public setLikes(likes: number) {
    this.likes = likes;
  }

  public setParent(parent: Commentary) {
    this.parent = parent;
  }

  private getTemplate(isSubComment = false) {
    const date = this.timestamp.toLocaleString('ru-RU', {day: '2-digit', month: '2-digit'});
    const time = this.timestamp.toLocaleString('ru-RU', {hour: '2-digit', minute: '2-digit'});

    let respondee = '';
    if (isSubComment) {
      respondee = `
        <span class="respondee">
            <img src="./images/reply.svg">
            <span class="reply">${this.parent?.author.name}</span>
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

  public getHTMLElement(isSubComment = false) {
    const stringHtml = this.getTemplate(isSubComment);
    this.commentEl = createElementFromString<HTMLDivElement>(stringHtml);

    const replyButton = this.commentEl.querySelector('.reply') as HTMLSpanElement;
    const plusButton = this.commentEl.querySelector('.plus') as HTMLDivElement;
    const minusButton = this.commentEl.querySelector('.minus') as HTMLDivElement;
    const favoriteButton = this.commentEl.querySelector('.action-favorite') as HTMLSpanElement;

    minusButton.onclick = this.handleRatingClick.bind(this);
    plusButton.onclick = this.handleRatingClick.bind(this);
    replyButton.onclick = this.handleReplyButtonPress.bind(this);
    favoriteButton.onclick = (e) => {
      this.handleFavoriteClick(e);
    }

    return this.commentEl;
  }

  private createReplyForm() {
    const replyForm = createElementFromString<HTMLFormElement>(`
      <form id="sub-comment-form">
          <img alt="avatar" src="./images/${this.app.currentUser.avatar}" width="30" height="30"/>
          <input class="sub-comment-input" type="text" name="message" />
          <button type="submit" name="submit" disabled>Отправить</input>
      </form>
    `);


    const input = replyForm.elements.namedItem('message') as HTMLInputElement;
    const submit = replyForm.elements.namedItem('submit') as HTMLInputElement;

    input.oninput = () => {
      // Disable/enable button
      if (input.value.length > 0) {
        submit.removeAttribute('disabled');
      } else {
        submit.setAttribute('disabled', '');
      }
    }

    replyForm.onsubmit = () => {
      const newComment = new Commentary({
        text: input.value,
        author: this.app.currentUser,
        app: this.app,
        parent: this
      });

      this.app.comments[newComment.id] = newComment;
      replyForm.replaceWith(newComment.getHTMLElement(true));
      this.app.persist();
    }

    return replyForm;
  }

  private handleReplyButtonPress() {
    // Don't add the form multiple times
    if (this.commentEl!.querySelector('#sub-comment-form')) return;

    const replyForm = this.createReplyForm();
    this.commentEl!.appendChild(replyForm);

    // Focus on the input
    (replyForm.elements.namedItem('message') as HTMLInputElement).focus();
  }

  private handleRatingClick(e: MouseEvent) {
    const target = e.currentTarget as HTMLDivElement;
    const counterEl = this.commentEl!.querySelector<HTMLSpanElement>('.likes-counter')!;

    if (target.classList.contains('minus')) {
      counterEl.innerText = String(Number(counterEl.innerText) - 1);
    } else {
      counterEl.innerText = String(Number(counterEl.innerText) + 1);
    }

    this.likes = Number(counterEl.innerText);
    this.app.persist();
  }

  private handleFavoriteClick(e: MouseEvent) {
    const target = e.currentTarget as HTMLAnchorElement;
    const image = target.querySelector<HTMLImageElement>('img')!;

    if (this.favorite) {
      image.setAttribute('src', `./images/heart_unfilled.svg`)
    } else {
      image.setAttribute('src', `./images/heart_filled.svg`)
    }

    this.favorite = !this.favorite;
    this.app.persist();
  }

  /**
   * Prepare data for LocalStorage
   */
  public getData() {
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
function createElementFromString<Type>(htmlString: string): Type {
  const parser = new DOMParser();
  return parser.parseFromString(htmlString, "text/html").body.firstChild as Type;
}