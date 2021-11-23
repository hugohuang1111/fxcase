
import { _decorator, Component, Node, systemEvent, SystemEvent, EventKeyboard, KeyCode, Vec3 } from 'cc';
const { ccclass, property } = _decorator;
 
@ccclass('CamCtl')
export class CamCtl extends Component {

    private speed: Vec3 = new Vec3();
    private distance: Vec3 = new Vec3();

    start () {
    }

    onEnable () {
        systemEvent.on(SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        systemEvent.on(SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    onDisable () {
        systemEvent.off(SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        systemEvent.off(SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    handleSpeed(speed: number, initSpeed: number): number {
        if (0 == speed) { return initSpeed; }
        return speed * 1.1;
    }

    onKeyDown (event: EventKeyboard) {
        switch (event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP: {
                this.speed.z = this.handleSpeed(this.speed.z, -1);
                break;
            }
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN: {
                this.speed.z = this.handleSpeed(this.speed.z, 1);
                break;
            }
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT: {
                this.speed.x = this.handleSpeed(this.speed.x, -1);
                break;
            }
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT: {
                this.speed.x = this.handleSpeed(this.speed.x, 1);
                break;
            }
            case KeyCode.KEY_Q: {
                this.speed.y = this.handleSpeed(this.speed.y, -1);
                break;
            }
            case KeyCode.KEY_E: {
                this.speed.y = this.handleSpeed(this.speed.y, 1);
                break;
            }
        }
    }

    onKeyUp (event: EventKeyboard) {
        this.speed.set(0, 0, 0);
    }

    update (deltaTime: number) {
        Vec3.multiplyScalar(this.distance, this.speed, deltaTime);
        this.node.translate(this.distance);
    }

}

