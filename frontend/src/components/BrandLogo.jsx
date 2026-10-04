import React from "react";
import logoImg from "../assets/logo.png";

export const BrandLogo = ({
  size = "md",
  className = "",
  onClick = null,
}) => {
  const sizeClasses = {
    xs: "h-7 w-auto",
    sm: "h-9 sm:h-10 w-auto",
    md: "h-11 sm:h-12 w-auto",
    lg: "h-16 sm:h-20 w-auto",
    xl: "h-22 sm:h-28 w-auto",
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center select-none ${
        onClick ? "cursor-pointer transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]" : ""
      } ${className}`}
    >
      <img
        src={logoImg}
        alt="Equitix - Predict | Analyze | Grow"
        className={`${selectedSize} object-contain transition-all`}
        loading="eager"
      />
    </div>
  );
};
