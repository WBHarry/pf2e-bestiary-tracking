export class ExpandedDragDrop extends foundry.applications.ux.DragDrop
  .implementation {
  bind(html) {
    // Identify and activate draggable targets
    if (this.can("dragstart", this.dragSelector)) {
      const draggables = html.querySelectorAll(this.dragSelector);
      for (let el of draggables) {
        el.setAttribute("draggable", true);
        el.ondragstart = this._handleDragStart.bind(this);
      }
    }

    // Identify and activate drop targets
    if (this.can("drop", this.dropSelector)) {
      const droppables =
        !this.dropSelector || html.matches(this.dropSelector)
          ? [html]
          : html.querySelectorAll(this.dropSelector);
      for (let el of droppables) {
        el.ondragover = this._handleDragOver.bind(this);
        el.ondragleave = this._handleDragLeave.bind(this);
        el.ondrop = this._handleDrop.bind(this);
      }
    }
    return this;
  }

  _handleDragLeave(event) {
    event.preventDefault();
    this.callback(event, "dragleave");
    return false;
  }
}
