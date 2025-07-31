export class PongModeSelector {
    private container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
        this.render();
    }

    private render() {
        this.container.innerHTML = '';
        this.container.style.backgroundColor = '#222';
        this.container.style.color = '#fff';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.alignItems = 'center';
        this.container.style.justifyContent = 'center';
        this.container.style.minHeight = '100vh';
        this.container.style.gap = '30px';

        const title = document.createElement('h1');
        title.textContent = 'Pong Game';
        title.style.marginBottom = '20px';

        const localButton = document.createElement('button');
        localButton.textContent = 'Local Game (2 Players)';
        localButton.style.padding = '15px 30px';
        localButton.style.fontSize = '18px';
        localButton.style.backgroundColor = '#007bff';
        localButton.style.color = 'white';
        localButton.style.border = 'none';
        localButton.style.borderRadius = '5px';
        localButton.style.cursor = 'pointer';

        const onlineButton = document.createElement('button');
        onlineButton.textContent = 'Online Game';
        onlineButton.style.padding = '15px 30px';
        onlineButton.style.fontSize = '18px';
        onlineButton.style.backgroundColor = '#28a745';
        onlineButton.style.color = 'white';
        onlineButton.style.border = 'none';
        onlineButton.style.borderRadius = '5px';
        onlineButton.style.cursor = 'pointer';

        localButton.addEventListener('click', () => {
            (window as any).router?.navigate('/game/local');
        });

        onlineButton.addEventListener('click', () => {
            (window as any).router?.navigate('/game/online');
        });

        this.container.appendChild(title);
        this.container.appendChild(localButton);
        this.container.appendChild(onlineButton);
    }
}