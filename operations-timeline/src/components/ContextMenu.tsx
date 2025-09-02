import React, { useEffect } from "react";
import { Edit24Regular, Delete24Regular } from "@fluentui/react-icons";

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  visible,
  x,
  y,
  onEdit,
  onDelete,
  onClose,
}) => {
  useEffect(() => {
    const handleClickOutside = () => {
      onClose();
    };

    if (visible) {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("contextmenu", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: y,
        left: x,
        zIndex: 9999,
        background: "white",
        border: "1px solid var(--colorNeutralStroke1)",
        borderRadius: "4px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        minWidth: "140px",
        padding: "4px 0",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          padding: "8px 16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "14px",
        }}
        onClick={onEdit}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor =
            "var(--colorNeutralBackground1Hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <Edit24Regular />
        Edit Operation
      </div>
      <div
        style={{
          height: "1px",
          backgroundColor: "var(--colorNeutralStroke2)",
          margin: "4px 0",
        }}
      />
      <div
        style={{
          padding: "8px 16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "14px",
        }}
        onClick={onDelete}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor =
            "var(--colorNeutralBackground1Hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <Delete24Regular />
        Delete Operation
      </div>
    </div>
  );
};
