class App {
  currentUser: User;
  messageCounter: number = 0;
  users: Array<User>;

  constructor(users: Array<User>) {
    this.users = users;
    this.currentUser = users[0];
    this.renderUserList();
  }

  renderUserList() {
    const userList = document.getElementById('user-list')!;

    userList.innerHTML = '';

    for (let i = 0; i < this.users.length; i++){
      const user = this.users[i];

      const userElement = this.createElementFromString(`
        <div class="user ${user.id === this.currentUser.id ? 'active' : ''}" data-user-id="${user.id}">
            <img src="./images/${user.avatar}" width="30" height="30">
            <span>${user.name}</span>
        </div>
      `) as HTMLDivElement;

      userElement.onclick = () => {
        this.currentUser = user;
        this.renderUserList();
      };

      userList.appendChild(userElement);
    }
  }

  createElementFromString(htmlString: string) {
    const parser = new DOMParser();
    return parser.parseFromString(htmlString, "text/html").body.firstChild;
  }
}

class User {
  id: number;
  name: string;
  avatar: string;
  comments: Array<Commentary> = [];

  constructor(id: number, name: string, avatar: string) {
    this.id = id;
    this.name = name;
    this.avatar = avatar;
  }

  addComment(comment: Commentary) {
    this.comments.push(comment);
  }
}

class Commentary {
  author: User;
  timestamp: Date;
  text: string;
  parent?: Commentary;
  child?: Commentary;
  favorite: boolean = false;
  likes: number = 0;

  constructor(text: string, author: User, parent?: Commentary, child?: Commentary) {
    this.text = text;
    this.author = author;
    this.timestamp = new Date();
    this.parent = parent;
    this.child = child;
  }

  getTemplate() {
    return `
      <div class="comment">
          <div class="comment-intrinsic">
              <img class="avatar" alt="" src="./images/avatar_2.png">
              <div>
                  <div class="heading">
                      <span class="user-name">${this.author.name}</span>
                      <span class="date">${this.timestamp}</span>
                  </div>
                  <p>${this.text}</p>
                  <div class="actions">
                      <a href="#" class="action-respond">
                          <img src="${this.author.avatar}">
                          <span class="reply">Ответить</span>
                      </a>
                      <a href="#" class="action-favorite">
                          <img src="./images/heart_icon.svg">
                          <span class="favorite">В избранном</span>
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
}