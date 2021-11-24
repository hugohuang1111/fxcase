
import { _decorator, Component, Node, systemEvent, SystemEvent, EventKeyboard, KeyCode, Vec3, Touch, EventTouch, Quat } from 'cc';
const { ccclass, property } = _decorator;
 
@ccclass('CamCtl')
export class CamCtl extends Component {

    private euler: Vec3 = new Vec3();
    private speed: Vec3 = new Vec3();
    private distance: Vec3 = new Vec3();

    start () {
    }

    onEnable () {
        systemEvent.on(SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        systemEvent.on(SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
        systemEvent.on(SystemEvent.EventType.TOUCH_MOVE, this.onTouchMove, this);
        systemEvent.on(SystemEvent.EventType.TOUCH_MOVE, this.onTouchEnd, this);
    }

    onDisable () {
        systemEvent.off(SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        systemEvent.off(SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
        systemEvent.off(SystemEvent.EventType.TOUCH_MOVE, this.onTouchMove, this);
        systemEvent.off(SystemEvent.EventType.TOUCH_MOVE, this.onTouchEnd, this);
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

    onTouchMove (touch: Touch, event: EventTouch) {
        let dir = event.getDelta();
        this.euler.x = dir.y / 10;
        this.euler.y = dir.x / 10;
    }

    onTouchEnd (touch: Touch, event: EventTouch) {
        this.euler.x = 0;
        this.euler.y = 0;
        this.euler.z = 0;
    }

    update (deltaTime: number) {
        Vec3.multiplyScalar(this.distance, this.speed, deltaTime);
        this.node.translate(this.distance);

        if (!Vec3.equals(Vec3.ZERO, this.euler)) {
            this.node.rotate(Quat.fromEuler(new Quat(), -this.euler.x, this.euler.y, this.euler.z));
        }
    }

}

