using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Хачатрян_задание3
{
    public class Lunch
    {
        private string dish1;
        private string dish2;
        private string dish3;
        private double price1;
        private double price2;
        private double price3;

        private const double discount = 5;

        public Lunch()
        {
            dish1 = "";
            dish2 = "";
            dish3 = "";
            price1 = 0;
            price2 = 0;
            price3 = 0;
        }

        public Lunch(string d1, double p1, string d2, double p2, string d3, double p3)
        {
            dish1 = d1;
            dish2 = d2;
            dish3 = d3;
            price1 = p1;
            price2 = p2;
            price3 = p3;
        }

        public string Dish1
        {
            get => dish1;
            set => dish1 = value;
        }

        public string Dish2
        {
            get => dish2;
            set => dish2 = value;
        }

        public string Dish3
        {
            get => dish3;
            set => dish3 = value;
        }

        public double Price1
        {
            get => price1;
            set => price1 = value;
        }

        public double Price2
        {
            get => price2;
            set => price2 = value;
        }

        public double Price3
        {
            get => price3;
            set => price3 = value;
        }

        public double TotalCost()
        {
            return price1 + price2 + price3;
        }

        public double CostWithDiscount()
        {
            return TotalCost() * (100 - discount) / 100;
        }

        public override string ToString()
        {
            return "Ланч:\r\n" +
                   "1) " + dish1 + " - " + price1 + " руб.\r\n" +
                   "2) " + dish2 + " - " + price2 + " руб.\r\n" +
                   "3) " + dish3 + " - " + price3 + " руб.";
        }
    }
}
