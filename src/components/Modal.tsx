import {Dialog} from "radix-ui";
import {X} from "lucide-react";
import {useRef,type ReactNode} from "react";
export function Modal({open,onClose,title,description,children,variant="info"}:{open:boolean;onClose:()=>void;title:string;description:string;children:ReactNode;variant?:"info"|"drawer"|"product"}){
const previous=useRef<HTMLElement|null>(null);
return <Dialog.Root open={open} onOpenChange={v=>{if(!v)onClose();}}><Dialog.Portal><Dialog.Overlay className="modal-backdrop"/><Dialog.Content onOpenAutoFocus={()=>{previous.current=document.activeElement as HTMLElement;}} onCloseAutoFocus={e=>{e.preventDefault();if(previous.current?.isConnected)previous.current.focus();}} className={"modal "+variant}><header className="modal-heading"><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description}</Dialog.Description><Dialog.Close className="icon-button modal-close" aria-label="Закрыть"><X/></Dialog.Close></header>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
